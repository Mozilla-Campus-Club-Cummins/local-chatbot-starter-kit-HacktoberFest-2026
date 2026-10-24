import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;
import java.net.InetSocketAddress;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.io.OutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import java.util.HashMap;
import java.util.Map;

public class ChatServer {

    static ObjectMapper mapper = new ObjectMapper();

    private static final String SYSTEM_PROMPT =
        "You are a friendly and helpful AI assistant. " +
        "Provide clear, accurate, and concise answers. " +
        "Maintain a polite and respectful tone.";

    public static void main(String[] args) throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress(8080), 0);

        server.createContext("/chat", (HttpExchange exchange) -> {
            try {
                // Allow any origin to call this server
                exchange.getResponseHeaders().set("Access-Control-Allow-Origin", "*");
                exchange.getResponseHeaders().set("Access-Control-Allow-Methods", "POST, OPTIONS");
                exchange.getResponseHeaders().set("Access-Control-Allow-Headers", "Content-Type");

                // Handle the browser's CORS preflight request
                if (exchange.getRequestMethod().equalsIgnoreCase("OPTIONS")) {
                    exchange.sendResponseHeaders(204, -1);
                    return;
                }

                // Read the incoming request body
                InputStream is = exchange.getRequestBody();
                ByteArrayOutputStream buffer = new ByteArrayOutputStream();
                is.transferTo(buffer);
                String rawBody = buffer.toString();

                // Parse the JSON and extract the user's message
                JsonNode requestNode = mapper.readTree(rawBody);
                String userMessage = requestNode.path("message").asText();

                System.out.println("Received: " + userMessage);

                // Build the request body for Ollama
                Map<String, Object> ollamaRequestMap = new HashMap<>();
                ollamaRequestMap.put("model", "llama3.2:1b");
                ollamaRequestMap.put("system", SYSTEM_PROMPT);
                ollamaRequestMap.put("prompt", userMessage);
                ollamaRequestMap.put("stream", false);

                String ollamaRequestBody =
                    mapper.writeValueAsString(ollamaRequestMap);

                // Send the request to Ollama
                HttpClient client = HttpClient.newHttpClient();
                HttpRequest ollamaRequest = HttpRequest.newBuilder()
                    .uri(URI.create("http://localhost:11434/api/generate"))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(ollamaRequestBody))
                    .build();

                HttpResponse<String> ollamaResponse = client.send(
                    ollamaRequest,
                    HttpResponse.BodyHandlers.ofString()
                );

                // Parse Ollama's response
                JsonNode rootNode = mapper.readTree(ollamaResponse.body());
                String aiReply = rootNode.get("response").asText();

                System.out.println("AI reply: " + aiReply);

                // Send back a clean JSON response
                Map<String, String> finalResponse = new HashMap<>();
                finalResponse.put("reply", aiReply);
                String responseJson = mapper.writeValueAsString(finalResponse);

                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, responseJson.getBytes().length);

                OutputStream os = exchange.getResponseBody();
                os.write(responseJson.getBytes());
                os.close();

            } catch (Exception e) {
                e.printStackTrace();
                try {
                    String errorMsg = "{\"error\": \"Something went wrong\"}";
                    exchange.sendResponseHeaders(500, errorMsg.length());
                    OutputStream os = exchange.getResponseBody();
                    os.write(errorMsg.getBytes());
                    os.close();
                } catch (Exception ignored) {}
            }
        });

        server.start();
        System.out.println("Server is running on http://localhost:8080/chat");
    }
}
