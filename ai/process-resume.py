from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain.prompts import PromptTemplate
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import CharacterTextSplitter
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain.chains import create_retrieval_chain
from langchain.vectorstores import Chroma
from langchain_community.document_loaders import DirectoryLoader
from langchain_community.document_loaders import TextLoader
from langchain.chains import RetrievalQA
import os
import sys

os.environ['GOOGLE_API_KEY']="AIzaSyCb4tdP2_JmjmM7g_iYoHuiPnFV3LKEazA"

llm = ChatGoogleGenerativeAI(model="gemini-pro")
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")
loader = PyPDFLoader("cvs/" + sys.argv[1].split('-')[1] + ".pdf")

pages = loader.load()



text_splitter = CharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
documents = text_splitter.split_documents(pages)

vectordb = Chroma.from_documents(documents,embeddings)

retriever = vectordb.as_retriever()

from langchain.prompts import PromptTemplate

prompt_template = """Act Like a skilled or very experience ATS(Application Tracking System)
with a deep understanding of the resume, fully parse and understand the resume as a recruiter. Then answer the questions provided carefully
{context}
Question: {question}
"""
prompt = PromptTemplate(
    template=prompt_template, input_variables=["context", "question"]
)

chain_type_kwargs = {"prompt": prompt}

qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    chain_type="stuff",
    retriever=retriever,
    chain_type_kwargs=chain_type_kwargs,
)

# query_template = "Given this Job requirements:{job_requirements}, Please return the name of the candidates and a summary of less than 200 words of the candidate's suitability for this position:"

# query = query_template.format(
#     job_requirements="Candidates must have UI UX experience"
# )

response = qa_chain.invoke({"query": sys.argv[1].split('-')[0]})


print(response['result'], flush=True)

# response = qa_chain.invoke({"query": "What is the place and language of the candidate"})


# print(response['result'])