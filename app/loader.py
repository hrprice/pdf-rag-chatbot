import os
import sys

from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFLoader
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_openai import OpenAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pymongo import MongoClient

load_dotenv()


def load_data(pdf_path):
    embeddings = OpenAIEmbeddings(model="text-embedding-3-large")

    mongo_client = MongoClient(os.getenv("MONGODB_ATLAS_CLUSTER_URI"))

    DB_NAME = os.getenv("DB_NAME")
    COLLECTION_NAME = os.getenv("COLLECTION_NAME")
    ATLAS_VECTOR_SEARCH_INDEX_NAME = os.getenv("ATLAS_VECTOR_SEARCH_INDEX_NAME")

    MONGODB_COLLECTION = mongo_client[DB_NAME][COLLECTION_NAME]

    vector_store = MongoDBAtlasVectorSearch(
        collection=MONGODB_COLLECTION,
        embedding=embeddings,
        index_name=ATLAS_VECTOR_SEARCH_INDEX_NAME,
        relevance_score_fn="cosine",
    )

    loader = PyPDFLoader(file_path=pdf_path)
    pages = loader.load_and_split()
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    all_splits = text_splitter.split_documents(pages)
    _ = vector_store.add_documents(documents=all_splits)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python loader.py 'pdf path'")
    else:
        print(f"Loading data from {sys.argv[1]}")
        load_data(sys.argv[1])
        print("Data successfully loaded to chroma_data")
