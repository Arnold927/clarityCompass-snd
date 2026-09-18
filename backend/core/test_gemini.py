from google.ai import generativelanguage as gl

client = gl.GenerativeServiceClient()

request = gl.GenerateContentRequest(
    model="models/gemini-2.5-flash",
    contents=[
        gl.Content(
            parts=[
                gl.Part(text="Hello from Kenya! Testing Gemini 2.5 Flash.")
            ]
        )
    ],
    generation_config=gl.GenerationConfig(
        temperature=0.7
    )
)

response = client.generate_content(request=request)

