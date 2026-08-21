export const askGroq = async (prompt, systemPrompt = "Eres el Asistente IA del Sistema Operativo SO-AR de CREAR PODER SIN LÍMITES. Responde de manera profesional, concisa y orientada a ayudar al equipo (Gerentes, QT, Entrenadores, Staff). Mantén la identidad de la marca siempre en alto.") => {
  const apiKey = import.meta.env.VITE_AIML_API_KEY || 'd1268e139ad739ff141837be41bf913d';

  if (!apiKey) {
    throw new Error("No se ha configurado la API Key de AIMLAPI.");
  }

  const response = await fetch("https://api.aimlapi.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "openai/gpt-5-5",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!response.ok) {
    let errorMsg = response.statusText;
    try {
      const errorData = await response.json();
      if (errorData.error?.message) errorMsg = errorData.error.message;
    } catch(e) {}
    throw new Error(`Error IA: ${errorMsg}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};
