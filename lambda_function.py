import boto3
import json
import uuid
import base64
import os
from datetime import datetime, timezone
from botocore.exceptions import ClientError

# Lambda region (same as your DynamoDB & S3)
AWS_REGION = os.environ.get("AWS_REGION", "ap-southeast-2")

# Bedrock client is always in us-east-1
bedrock = boto3.client("bedrock-runtime", region_name="us-east-1")

# DynamoDB in Lambda region
dynamodb = boto3.resource("dynamodb", region_name=AWS_REGION)
prompts_table = dynamodb.Table("ImagePrompts")
images_table = dynamodb.Table("GeneratedImages")

# S3 bucket
s3 = boto3.client("s3", region_name=AWS_REGION)
BUCKET_NAME = "ai-image-generator-store"


# ---------- helpers for size + style ----------

def map_size(size_value: str):
    """
    Map incoming size selection to (width, height).
    Accepts labels like 'square', 'landscape', 'portrait'
    or text like 'Square (512x512)', 'Landscape (768x512)', etc.
    """
    if not size_value:
        return 1024, 1024

    v = size_value.lower()

    if "landscape" in v or "768x512" in v:
        return 768, 512
    if "portrait" in v or "512x768" in v:
        return 512, 768
    if "square" in v or "512x512" in v:
        return 512, 512

    # fallback
    return 1024, 1024


def apply_art_style(prompt: str, style_value: str):
    """
    Add style hint to the prompt in a safe way.
    style_value examples: default, photorealistic, digital, oil, watercolor, anime, cyberpunk, fantasy
    """
    if not style_value:
        return prompt

    s = style_value.lower()

    if s == "photorealistic":
        return f"{prompt} Rendered as an ultra realistic photograph with natural lighting."
    elif s == "digital art":
        return f"{prompt} Illustrated in high quality digital art style."
    elif s == "oil painting":
        return f"{prompt} Painted in detailed oil painting style on canvas."
    elif s == "watercolor":
        return f"{prompt} Painted in soft watercolor illustration style."
    elif s == "anime":
        return f"{prompt} Drawn in clean, colorful anime illustration style."
    elif s == "cyberpunk":
        return f"{prompt} With neon lights and futuristic cyberpunk aesthetic."
    elif s == "fantasy":
        return f"{prompt} In a magical fantasy art style."
    else:
        # unknown style → leave prompt as is
        return prompt


# ---------- Titan invocation ----------

def generate_image_from_titan(prompt: str, width: int, height: int) -> str:
    """Call Titan and return base64 image string. Raises ValueError if blocked."""
    payload = {
        "taskType": "TEXT_IMAGE",
        "textToImageParams": {
            "text": prompt
        },
        "imageGenerationConfig": {
            "numberOfImages": 1,
            "quality": "standard",
            "height": height,
            "width": width,
            "cfgScale": 8,
            "seed": 0
        }
    }

    try:
        response = bedrock.invoke_model(
            modelId="amazon.titan-image-generator-v1",
            body=json.dumps(payload),
            contentType="application/json",
            accept="application/json"
        )
    except ClientError as e:
        if e.response["Error"]["Code"] == "ValidationException":
            raise ValueError(
                "Image blocked by safety filter. Try a simpler or clearly safe prompt."
            )
        else:
            raise

    result = json.loads(response["body"].read())
    return result["images"][0]  # base64 image string


# ---------- main handler ----------

def lambda_handler(event, context):
    # Support both direct test and API Gateway
    body = {}
    prompt = ""

    if "prompt" in event and not isinstance(event.get("body"), str):
        # Direct test event: { "prompt": "...", "size": "...", "style": "..." }
        body = event
        prompt = event["prompt"]
    else:
        body_str = event.get("body", "{}")
        body = json.loads(body_str)
        prompt = body.get("prompt", "a simple image")

    # Read size + style from request
    size_value = body.get("size") or body.get("imageSize")
    style_value = body.get("style") or body.get("artStyle")

    # Map to width/height
    width, height = map_size(size_value)

    # Apply art style to prompt
    styled_prompt = apply_art_style(prompt, style_value)

    # ---------- generate image (with safety handling) ----------
    try:
        image_base64 = generate_image_from_titan(styled_prompt, width, height)
    except ValueError as ve:
        response_body = {
            "error": "blocked",
            "message": str(ve),
            "prompt": prompt,
            "styledPrompt": styled_prompt
        }
        return {
            "statusCode": 400,
            "headers": {"Content-Type": "application/json"},
            "body": json.dumps(response_body)
        }

    # Convert base64 → binary
    image_bytes = base64.b64decode(image_base64)

    now = datetime.now(timezone.utc).isoformat()
    prompt_id = str(uuid.uuid4())
    image_id = str(uuid.uuid4())

    # Store original prompt + user selections
    prompts_table.put_item(
        Item={
            "promptId": prompt_id,
            "promptText": prompt,
            "styledPrompt": styled_prompt,
            "size": size_value or "default",
            "style": style_value or "default",
            "createdAt": now
        }
    )

    # Upload image to S3
    s3_key = f"generated-images/{image_id}.png"

    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=s3_key,
        Body=image_bytes,
        ContentType="image/png"
    )

    # Store metadata in DynamoDB
    images_table.put_item(
        Item={
            "imageId": image_id,
            "promptId": prompt_id,
            "s3Key": s3_key,
            "width": width,
            "height": height,
            "createdAt": now
        }
    )

    # Return response to frontend
    response_body = {
        "promptId": prompt_id,
        "imageId": image_id,
        "s3Key": s3_key,
        "width": width,
        "height": height,
        "imageBase64": image_base64
    }

    return {
        "statusCode": 200,
        "headers": {"Content-Type": "application/json"},
        "body": json.dumps(response_body)
    }









