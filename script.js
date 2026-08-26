// ========================================
// CONVERSATION HISTORY
// ========================================

let conversationHistory = [];

let isSending = false;


// ========================================
// DARK / LIGHT MODE
// ========================================

function toggleMode() {

    const body = document.body;
    const toggleButton = document.querySelector(".toggle-mode");

    body.classList.toggle("dark-mode");
    body.classList.toggle("light-mode");

    const isDark = body.classList.contains("dark-mode");

    toggleButton.textContent = isDark
        ? "Light Mode"
        : "Dark Mode";

    localStorage.setItem(
        "theme",
        isDark ? "dark" : "light"
    );
}


// ========================================
// SEND MESSAGE
// ========================================

async function sendMessage() {

    // Mos lejo dy mesazhe njëkohësisht
    if (isSending) return;

    const userInput =
        document.getElementById("userInput");

    const chatMessages =
        document.getElementById("chatMessages");

    const message =
        userInput.value.trim();

    if (message === "") return;

    isSending = true;

    // ========================================
    // USER MESSAGE
    // ========================================

    const userMessage =
        document.createElement("div");

    userMessage.classList.add("user-message");

    userMessage.textContent = message;

    chatMessages.appendChild(userMessage);

    userInput.value = "";

    chatMessages.scrollTop =
        chatMessages.scrollHeight;


    // ========================================
    // SAVE USER MESSAGE
    // ========================================

    conversationHistory.push({
        role: "user",
        content: message
    });


    // ========================================
    // BOT MESSAGE
    // ========================================

    const botMessage =
        document.createElement("div");

    botMessage.classList.add("bot-message");

    botMessage.textContent =
        "Alesia po shkruan...";

    chatMessages.appendChild(botMessage);

    chatMessages.scrollTop =
        chatMessages.scrollHeight;


    try {

        // ========================================
        // SEND REQUEST TO BACKEND
        // ========================================

        const response = await fetch(
            "https://alesia-chatbot-backend.onrender.com/api/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    messages: conversationHistory
                })
            }
        );


        // ========================================
        // CHECK RESPONSE
        // ========================================

        if (!response.ok) {

            let errorMessage =
                "Gabim në server.";

            try {

                const errorData =
                    await response.json();

                errorMessage =
                    errorData.error ||
                    errorMessage;

            } catch {

                // Nëse serveri nuk kthen JSON
            }

            throw new Error(errorMessage);
        }


        // ========================================
        // STREAMING
        // ========================================

        if (!response.body) {
            throw new Error(
                "Serveri nuk mbështet streaming."
            );
        }


        const reader =
            response.body.getReader();

        const decoder =
            new TextDecoder("utf-8");


        let fullResponse = "";

        let firstChunk = true;


        // ========================================
        // READ STREAM
        // ========================================

        while (true) {

            const {
                value,
                done
            } = await reader.read();


            if (done) {
                break;
            }


            const chunk =
                decoder.decode(
                    value,
                    { stream: true }
                );


            if (!chunk) continue;


            // Kur vjen pjesa e parë
            // heqim "Alesia po shkruan..."
            if (firstChunk) {

                botMessage.textContent = "";

                firstChunk = false;
            }


            // Shtojmë tekstin e ri
            fullResponse += chunk;

            botMessage.textContent =
                fullResponse;


            // Scroll automatik
            chatMessages.scrollTop =
                chatMessages.scrollHeight;
        }


        // ========================================
        // SAVE ALESIA RESPONSE
        // ========================================

        if (fullResponse.trim() !== "") {

            conversationHistory.push({
                role: "assistant",
                content: fullResponse
            });

        }


    } catch (error) {

        console.error(
            "❌ Chat error:",
            error
        );


        botMessage.textContent =
            "Më fal 😭 Pata një problem. Provo përsëri.";


        // Nëse request-i dështoi,
        // heqim mesazhin e fundit të user-it
        // nga history që të mos prishet biseda.

        conversationHistory.pop();

    } finally {

        isSending = false;

        userInput.focus();

    }


    chatMessages.scrollTop =
        chatMessages.scrollHeight;
}


// ========================================
// PAGE LOADED
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const toggleButton =
            document.querySelector(
                ".toggle-mode"
            );

        const sendButton =
            document.querySelector(
                ".send-button"
            );

        const userInput =
            document.getElementById(
                "userInput"
            );


        // ========================================
        // THEME
        // ========================================

        const savedTheme =
            localStorage.getItem("theme") ||
            "light";


        document.body.classList.add(
            savedTheme + "-mode"
        );


        toggleButton.textContent =
            savedTheme === "dark"
                ? "Light Mode"
                : "Dark Mode";


        // ========================================
        // DARK / LIGHT BUTTON
        // ========================================

        toggleButton.addEventListener(
            "click",
            toggleMode
        );


        // ========================================
        // SEND BUTTON
        // ========================================

        sendButton.addEventListener(
            "click",
            sendMessage
        );


        // ========================================
        // ENTER KEY
        // ========================================

        userInput.addEventListener(
            "keydown",
            function (e) {

                if (e.key === "Enter") {

                    e.preventDefault();

                    sendMessage();

                }

            }
        );

    }
);