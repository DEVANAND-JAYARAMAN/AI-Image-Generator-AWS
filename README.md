# AI Image Generator

This project is a web-based AI Image Generator that allows users to create stunning visuals from text prompts. It features a modern, responsive interface and a gallery to browse recent creations.

## Features

- **Generate Images from Text:** Simply describe your vision, and the AI will generate an image.
- **Art Style and Image Size Selection:** Customize your creations by choosing from various art styles and image sizes.
- **Image Gallery:** Browse through a gallery of recently generated images.
- **Download, Share, and Save:** Easily download, share, or save your favorite images.
- **Responsive Design:** The application is designed to work on both desktop and mobile devices.

## How It Works

The application consists of a frontend built with HTML, CSS, and vanilla JavaScript, and a backend powered by an AWS serverless architecture.

- The frontend provides the user interface for generating and managing images.
- The backend uses an AWS Lambda function to generate images based on the user's prompt and an API Gateway to expose the functionality as a REST API.

## Getting Started

To run this project locally, you will need to set up your own backend on AWS.

### Prerequisites

- An AWS account.
- Basic knowledge of AWS Lambda and API Gateway.

### Backend Setup

1. **Create a Lambda Function:**
   - Create a new Lambda function in your AWS account.
   - The Lambda function should be able to take a text prompt as input and return a base64 encoded image.

2. **Create an API Gateway:**
   - Create a new REST API in API Gateway.
   - Create a `POST` method for a new resource (e.g., `/generate-image`).
   - Configure the `POST` method to trigger your Lambda function.
   - Deploy the API to a stage (e.g., `dev`).

### Frontend Setup

1. **Clone the Repository:**
   ```bash
   git clone https://github.com/your-username/ai-image-generator.git
   cd ai-image-generator
   ```

2. **Update the API Endpoint:**
   - Open the `app.js` file.
   - Find the `API_URL` constant and replace the existing URL with the invoke URL of your API Gateway stage.
   ```javascript
   const API_URL = "https://your-api-gateway-id.execute-api.your-region.amazonaws.com/dev/generate-image";
   ```

3. **Run the Application:**
   - Open the `index.html` file in your web browser.

## Project Structure

```
.
├── app.js             # Main application logic
├── index.html         # HTML structure of the application
├── styles.css         # Styles for the application
├── prompts.md         # A collection of sample prompts
└── README.md          # This file
```

## Technologies Used

- **Frontend:**
  - HTML
  - CSS
  - Vanilla JavaScript
- **Backend:**
  - AWS Lambda
  - AWS API Gateway
  - AWS IAM
  - AWS S3
  - AWS Amplify (for frontend hosting)
  - AWS Bedrock
  - AWS CloudWatch
  - AWS DynamoDB (for storing prompts and image data)
