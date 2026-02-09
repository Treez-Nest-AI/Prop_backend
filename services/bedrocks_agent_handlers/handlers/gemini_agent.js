const { GoogleGenerativeAI } = require('@google/generative-ai');

// Property projects database
const PROPERTY_PROJECTS = {
    apartments: [
        { name: "2G TULA", price: "₹ 1.8 Cr onwards" },
        { name: "Ranka Ankura", price: "₹ 1.3 Cr onwards" },
        { name: "SBR One Residences", price: "₹ 1.7 Cr onwards" },
        { name: "Candeur Carlisle", price: "₹ 1.5 Cr onwards" },
        { name: "Sobha Neopolis", price: "₹ 98 Lakhs onwards" },
        { name: "Purva Atmosphere", price: "₹ 2.7 Cr onwards" },
        { name: "Concorde NEO", price: "₹ 1.1 Cr onwards" },
        { name: "Orchid Life", price: "₹ 92 Lakhs onwards" },
        { name: "Prestige Raintree Park", price: "₹ 2.8 Cr onwards" },
        { name: "Mahindra Blossom", price: "₹ 1.9 Cr onwards" },
        { name: "Nambiar District 25 – Phase 2", price: "₹ 1.7 Cr onwards" },
        { name: "Sumadhura Codename Tea & Twilight", price: "₹ 1.85 Cr onwards" },
        { name: "Folium by Sumadhura – Phase 4", price: "₹ 2.24 Cr onwards" },
        { name: "Sumadhura E-119", price: "₹ 2.4 Cr onwards" },
        { name: "Lorven Cascade Garden", price: "₹ 1.45 Cr onwards" },
        { name: "Sumadhura Capitol Residences", price: "₹ 2.7 Cr onwards" },
        { name: "Trendsquares AKINO", price: "₹ 1.7 Cr onwards" },
        { name: "Lodha Heaven", price: "₹ 2.36 Cr onwards" },
        { name: "Brigade Avalon", price: "₹ 4.62 Cr onwards" },
        { name: "Brigade Citrine", price: "₹ 2.07 Cr onwards" },
        { name: "Godrej Parkshire", price: "₹ 1.17 Cr onwards" },
        { name: "Vajram Vivera", price: "₹ 2.25 Cr onwards" }
    ],
    villas: [
        { name: "Adarsh Sanctuary Villa", price: "₹ 5.4 Cr onwards" },
        { name: "Trifecta Verde en Resplandor Phase 3", price: "₹ 2.8 Cr onwards" },
        { name: "Konig Fortune County", price: "₹ 2.9 Cr onwards" },
        { name: "Alluri Avani Villa", price: "₹ 4 Cr onwards" },
        { name: "NCC Urban Retreat", price: "₹ 5.49 Cr onwards" },
        { name: "Nambiar Ellegenza Phase 2", price: "₹ 5.37 Cr onwards" },
        { name: "Riviera Uno", price: "₹ 4.91 Cr onwards" }
    ],
    plots: [
        { name: "Prestige Marigold Phase 2", price: "₹ 1.2 Cr onwards" },
        { name: "Brigade Oasis Phase 2", price: "₹ 1.09 Cr onwards" },
        { name: "Godrej Reserve Phase 2", price: "₹ 35.99 Lakhs onwards" },
        { name: "Ivy County", price: "₹ 1.15 Cr onwards" }
    ],
    farmland: [
        { name: "Green Siri Farmland", price: "₹ 25 Lakhs onwards" },
        { name: "Hebbevu Farmland", price: "₹ 18 Lakhs onwards" }
    ]
};

// Format project list for prompt: "Name (price), Name (price), ..."
function formatProjectList(projects) {
    return projects.map(p => `${p.name} (${p.price})`).join(", ");
}

const SYSTEM_PROMPT = `You are an expert property consultant helping customers find their perfect property from our exclusive portfolio of 35 premium projects in Bangalore.

YOUR PROJECTS (STRICTLY ONLY THESE):
🏢 APARTMENTS (22): ${formatProjectList(PROPERTY_PROJECTS.apartments)}
🏡 VILLAS (7): ${formatProjectList(PROPERTY_PROJECTS.villas)}
📐 PLOTS (4): ${formatProjectList(PROPERTY_PROJECTS.plots)}
🌾 FARMLAND (2): ${formatProjectList(PROPERTY_PROJECTS.farmland)}

CRITICAL RULES:
1. ONLY discuss these 35 projects - never mention or recommend any other properties
2. If asked about projects not in this list, politely say they're not in your portfolio
3. Be a persuasive consultant - understand needs, build rapport, and guide to best matches
4. Ask clarifying questions about: budget, location preference, property type, size, amenities
5. Match customer needs to 2-3 projects and explain why they're perfect fits
6. Use emotional selling - talk about lifestyle, family benefits, investment value
7. Be enthusiastic and confident about your recommendations
8. Whenever Users requests for comparison, always use the comparison table format provided in the prompt and below comparison table just provide last words like which will be better for them.
9. whenever u provide properties always provide with category differentiation like 1. Under Construction 2. Ready To Move 3. pre launch project.

CONVERSATION FLOW:
- Greet warmly and ask about their property search
- Understand their requirements (budget, location, type, purpose)
- Recommend 2-3 best matches from YOUR 35 projects
- Highlight unique features and benefits
- Address concerns and build urgency
- Guide toward scheduling a site visit

Keep responses conversational, persuasive, and focused on YOUR portfolio only.`;

// Initialize Gemini client
let genAI;

function getGeminiClient() {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

// CORS headers - permissive so frontend never hits CORS errors
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Accept,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token,X-Requested-With,Origin',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Max-Age': '86400'
};

exports.handler = async (event) => {
    console.log('Event:', JSON.stringify(event, null, 2));

    // Handle OPTIONS request for CORS
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: ''
        };
    }

    try {
        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const { messages, sessionId } = body;

        // Validate input
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return {
                statusCode: 400,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    error: 'Invalid request',
                    message: 'Messages array is required'
                })
            };
        }

        // Get Gemini client
        const client = getGeminiClient();
        const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

        // Build conversation history for Gemini
        const conversationHistory = messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
        }));

        // Start chat with system prompt
        const chat = model.startChat({
            history: [
                {
                    role: 'user',
                    parts: [{ text: SYSTEM_PROMPT }]
                },
                {
                    role: 'model',
                    parts: [{ text: 'starts fromstood! I will act as a professional property consultant and ONLY recommend properties from the 35 projects you have provided. I will not mention or suggest any other properties outside this exclusive portfolio. I am ready to help customers find their perfect property!' }]
                },
                ...conversationHistory.slice(0, -1) // Add history except last message
            ]
        });

        // Get the last user message
        const lastMessage = messages[messages.length - 1];

        // Send message and get response
        const result = await chat.sendMessage(lastMessage.content);
        const response = await result.response;
        const assistantMessage = response.text();

        // Log for monitoring
        console.log('Response generated successfully', {
            sessionId,
            messageLength: assistantMessage.length
        });

        return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: assistantMessage,
                sessionId: sessionId || null
            })
        };

    } catch (error) {
        console.error('Error:', error);

        // Handle specific error types
        let statusCode = 500;
        let errorMessage = 'Internal server error';

        if (error.message.includes('API key')) {
            statusCode = 401;
            errorMessage = 'Invalid API key';
        } else if (error.message.includes('quota')) {
            statusCode = 429;
            errorMessage = 'Rate limit exceeded';
        } else if (error.message) {
            errorMessage = error.message;
        }

        return {
            statusCode,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Error processing request',
                message: errorMessage
            })
        };
    }
};