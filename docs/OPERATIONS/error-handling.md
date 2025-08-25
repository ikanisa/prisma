# Global Error Handling

The `n8n/global_error_handler.json` workflow acts as the centralized error handler for this project. It captures workflow failures, logs the error payload, and posts a notification to an external endpoint.

## Using the Handler in Other Workflows

1. Import `global_error_handler.json` into your n8n instance if it is not already present.
2. Open the workflow that needs error handling and choose **Settings**.
3. In the **Error Workflow** field, select or enter the name/ID of the "Global Error Handler" workflow.
4. Save the workflow.

With this configuration, any runtime error triggers the shared handler which logs the error and sends a notification.
