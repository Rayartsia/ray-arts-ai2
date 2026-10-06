export default async function handler(req, res) {
  // CORS
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://rayartsia.github.io"
  );
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método não permitido"
    });
  }

  try {
    const { image, level, detail, line, mirror } = req.body || {};

    if (!image) {
      return res.status(400).json({
        error: "Nenhuma imagem foi enviada."
      });
    }

    const levelText = {
      delicado:
        "EXTREMAMENTE DELICADO: poucas linhas, linhas finas, poucos detalhes internos e muito espaço negativo.",
      medio:
        "NÍVEL MÉDIO: equilíbrio entre linhas finas, detalhes e leitura clara para tatuagem.",
      detalhado:
        "DETALHADO: preservar mais detalhes importantes da referência, mas sem criar excesso de informação."
    };

    const prompt = `
Você é o motor de geração do RAY ARTS AI, especializado em criar
DECALQUES PARA TATUAGEM.

Analise a imagem de referência enviada pelo usuário.

OBJETIVO:
Transformar a referência em um desenho próprio para transferência
térmica e tatuagem.

REGRAS PRINCIPAIS:
- Preservar rigorosamente a composição, proporções e elementos principais.
- NÃO inventar elementos novos.
- Fundo totalmente branco.
- Desenho preto e branco.
- Sem cores.
- Sem aparência de pintura.
- Sem aparência de fotografia.
- Sem efeitos 3D.
- Sem textura digital excessiva.
- Linhas limpas e controladas.
- Remover ruídos e detalhes desnecessários.
- Priorizar leitura clara na pele.
- Manter áreas de respiro e espaço negativo.
- Não transformar o desenho em uma ilustração excessivamente complexa.
- Não adicionar molduras, textos ou elementos que não existam na referência.
- Resultado final deve parecer um DECALQUE PROFISSIONAL DE TATUAGEM.

NÍVEL ESCOLHIDO:
${levelText[level] || levelText.delicado}

CONTROLE DE DETALHE:
${detail || 50}/100.

DELICADEZA DAS LINHAS:
${line || 50}/100.

ESPELHAMENTO:
${mirror ? "A composição deverá ser espelhada horizontalmente." : "Não espelhar."}

IMPORTANTE:
O resultado deve ser limpo, profissional e realmente utilizável
como base para decalque térmico.
`;

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-6-astra",
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: prompt
                },
                {
                  type: "input_image",
                  image_url: image,
                  detail: "high"
                }
              ]
            }
          ],
          tools: [
            {
              type: "image_generation",
              action: "edit",
              model: "gpt-image-2",
              background: "opaque",
              output_format: "png",
              quality: "medium",
              size: "auto"
            }
          ],
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenAI error:", data);

      return res.status(response.status).json({
        error:
          data?.error?.message ||
          "Erro ao gerar a imagem."
      });
    }

    const imageCall = data.output?.find(
      item => item.type === "image_generation_call"
    );

    if (!imageCall?.result) {
      console.error("Resposta sem imagem:", data);

      return res.status(500).json({
        error: "A IA não retornou uma imagem."
      });
    }

    return res.status(200).json({
      image: `data:image/png;base64,${imageCall.result}`
    });

  } catch (error) {
    console.error("Server error:", error);

    return res.status(500).json({
      error: "Erro interno ao gerar o decalque."
    });
  }
}
