export const askGroq = async (prompt, systemPrompt = "Eres el Asistente IA del Sistema Operativo SO-AR de CREAR PODER SIN LÍMITES. Responde de manera profesional, concisa y orientada a ayudar al equipo (Gerentes, QT, Entrenadores, Staff). Mantén la identidad de la marca siempre en alto.") => {
  try {
    // Apunta al servidor backend. En producción, usar URL real (ej: https://api.crearpsl.net)
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:3001";
    
    const response = await fetch(`${backendUrl}/api/ia/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ prompt, systemPrompt })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || response.statusText);
    }

    const data = await response.json();
    return data.result;
  } catch (error) {
    console.error("Error contactando al backend de IA:", error);
    throw new Error(`Error IA: ${error.message}`);
  }
};
