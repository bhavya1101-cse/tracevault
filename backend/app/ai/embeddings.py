import os
import google.generativeai as genai
import chromadb

genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

chroma_client = chromadb.PersistentClient(path="../vector_db")
collection = chroma_client.get_or_create_collection(name="evidence_logs")


def embed_text(text: str) -> list[float]:
    """Converts text into a vector using Gemini's embedding model."""
    result = genai.embed_content(
        model="models/gemini-embedding-001",
        content=text[:3000],
    )
    return result["embedding"]


def add_to_vector_store(evidence_id: str, filename: str, content: str):
    """Embeds and stores one piece of evidence in ChromaDB."""
    vector = embed_text(content)
    collection.upsert(
        ids=[evidence_id],
        embeddings=[vector],
        metadatas=[{"filename": filename}],
        documents=[content[:1000]],
    )


def search_similar(query: str, top_k: int = 5):
    """Embeds a query and returns the most similar stored evidence."""
    query_vector = embed_text(query)
    results = collection.query(query_embeddings=[query_vector], n_results=top_k)
    return results