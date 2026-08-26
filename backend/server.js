const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

// ===============================
// GEMINI API KEY
// ===============================

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY mungon në .env");
    process.exit(1);
}

console.log("✅ GEMINI_API_KEY u gjet");

// ===============================
// EXPRESS
// ===============================

const app = express();

app.use(cors());
app.use(express.json());

// ===============================
// GEMINI
// ===============================

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// ===============================
// ALESIA PERSONALITY
// ===============================

const ALESIA_PROMPT = `
Ti je Alesia, një shoqe virtuale që flet shqip.

Gjuha jote kryesore është shqipja.

Kupto:
- shqipen formale dhe bisedore
- gabimet drejtshkrimore
- mungesën e ë dhe ç
- shkurtime si "ca", "cfare", "si jee", "bo", "jam tu"
- fjalë angleze të përziera me shqipen

Përgjigju natyrshëm në shqip.

PERSONALITETI:

- e ngrohtë
- miqësore
- empatike
- kurioze
- playful
- me humor kur situata e lejon
- jo shumë formale
- jo robotike

Mos e nis çdo përgjigje me "Sigurisht!".

Mos përsërit të njëjtat fraza.

Mos bëj pyetje në fund të çdo përgjigjeje vetëm për të vazhduar bisedën.

Mos e tepro me emoji.

Mos u emociono në mënyrë artificiale për çdo gjë që thotë përdoruesi.

Përshtatu me mënyrën se si shkruan përdoruesi.

Ti je një AI dhe nuk pretendon të jesh njeri real.

Nëse përdoruesi shkruan në anglisht,
mund ta kuptosh, por përgjigju në shqip,
përveç nëse kërkon shprehimisht anglisht.

Nëse nuk e di një informacion, thuaje sinqerisht.

Mos shpik fakte.

Përgjigjet duhet të jenë natyrshme dhe relativisht të shkurtra,
përveç kur përdoruesi kërkon shpjegim të detajuar.
`;

// ===============================
// HOME ROUTE
// ===============================

app.get("/", (req, res) => {
    res.json({
        message: "Alesia API is running 🌸"
    });
});

// ===============================
// CHAT API - STREAMING
// ===============================

app.post("/api/chat", async (req, res) => {

    try {

        const { messages } = req.body;

        // Kontrollojmë messages
        if (!Array.isArray(messages)) {
            return res.status(400).json({
                error: "Messages duhet të jetë një array."
            });
        }

        // Kontrollojmë që të paktën një mesazh ekziston
        if (messages.length === 0) {
            return res.status(400).json({
                error: "Nuk ka mesazhe."
            });
        }

        // ===============================
        // CONVERSATION HISTORY
        // ===============================

        const conversation = messages
            .map(message => {

                const role =
                    message.role === "assistant"
                        ? "Alesia"
                        : "Përdoruesi";

                return `${role}: ${message.content}`;

            })
            .join("\n");

        // ===============================
        // FINAL PROMPT
        // ===============================

        const prompt = `
${ALESIA_PROMPT}

HISTORIA E BISEDËS:

${conversation}

Jep vetëm përgjigjen e Alesia-s për mesazhin e fundit.
Mos shkruaj "Alesia:" përpara përgjigjes.
`;

        console.log("💬 Mesazh i ri:", messages[messages.length - 1].content);

        // ===============================
        // STREAM FROM GEMINI
        // ===============================

        const stream = await ai.models.generateContentStream({
            model: "gemini-3.6-flash",
            contents: prompt
        });

        // ===============================
        // STREAM HEADERS
        // ===============================

        res.status(200);

        res.setHeader(
            "Content-Type",
            "text/plain; charset=utf-8"
        );

        res.setHeader(
            "Cache-Control",
            "no-cache, no-transform"
        );

        res.setHeader(
            "Connection",
            "keep-alive"
        );

        res.setHeader(
            "X-Accel-Buffering",
            "no"
        );

        // ===============================
        // SEND CHUNKS
        // ===============================

        for await (const chunk of stream) {

            const text = chunk.text;

            if (text) {

                res.write(text);

            }
        }

        // ===============================
        // FINISH
        // ===============================

        res.end();

        console.log("✅ Përgjigjja u dërgua.");

    } catch (error) {

        console.error("========== ALESIA ERROR ==========");

        console.error(
            "Message:",
            error.message
        );

        console.error(
            "Status:",
            error.status
        );

        console.error(
            "Name:",
            error.name
        );

        console.error(
            "==================================="
        );

        // Nëse streaming nuk ka filluar
        if (!res.headersSent) {

            return res.status(500).json({
                error:
                    error.message ||
                    "Unknown error"
            });
        }

        // Nëse streaming ka filluar
        res.end();
    }
});

// ===============================
// START SERVER
// ===============================

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {

    console.log(
        `🌸 Alesia API running on port ${PORT}`
    );

});