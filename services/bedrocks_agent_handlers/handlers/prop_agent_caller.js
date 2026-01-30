const { BedrockAgentRuntimeClient, InvokeAgentCommand } = require("@aws-sdk/client-bedrock-agent-runtime");

// Initialize the Bedrock Agent Runtime client
const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION || "ap-south-1" });

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Max-Age': '86400'
};

exports.handler = async (event) => {
    // Handle OPTIONS preflight request
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        // Parse API Gateway event
        let body = {};
        if (event.body) {
            try {
                body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
            } catch (e) {
                // If body is not valid JSON, treat it as plain text
                body = { inputText: event.body };
            }
        }

        // Extract parameters from body, query params, or event directly
        const agentId = body.agentId || event.queryStringParameters?.agentId || process.env.AGENT_ID || "0T1NJ6YOU5";
        const agentAliasId = body.agentAliasId || event.queryStringParameters?.agentAliasId || process.env.AGENT_ALIAS_ID || "BFBALYJ4GO";
        const sessionId = body.sessionId || event.queryStringParameters?.sessionId || event.sessionId || generateSessionId();
        const inputText = body.inputText || body.prompt || event.queryStringParameters?.inputText || event.queryStringParameters?.prompt;
        const enableTrace = body.enableTrace || event.queryStringParameters?.enableTrace === 'true' || event.enableTrace || false;
        const endSession = body.endSession || event.queryStringParameters?.endSession === 'true' || event.endSession || false;

        // Validate required parameters
        if (!agentId || !agentAliasId || !inputText) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    error: "Missing required parameters: agentId, agentAliasId, and inputText are required",
                    received: {
                        agentId: !!agentId,
                        agentAliasId: !!agentAliasId,
                        inputText: !!inputText
                    }
                })
            };
        }

        // Prepare the command to invoke the agent
        const command = new InvokeAgentCommand({
            agentId: agentId,
            agentAliasId: agentAliasId,
            sessionId: sessionId,
            inputText: inputText,
            enableTrace: enableTrace,
            endSession: endSession
        });

        // Invoke the agent
        const response = await client.send(command);

        // Process the streaming response
        let fullResponse = "";
        const traces = [];
        
        for await (const chunk of response.completion) {
            if (chunk.chunk) {
                const decodedChunk = new TextDecoder().decode(chunk.chunk.bytes);
                fullResponse += decodedChunk;
            }
            
            if (chunk.trace && enableTrace) {
                traces.push(chunk.trace);
            }
        }

        // Return successful response
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                status: "success",
                response: fullResponse,
                sessionId: sessionId,
                traces: traces.length > 0 ? traces : undefined
            })
        };

    } catch (error) {
        console.error("Error invoking Bedrock agent:", error);
        
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                error: "Failed to invoke Bedrock agent",
                message: error.message
            })
        };
    }
};

// Helper function to generate a unique session ID
function generateSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}