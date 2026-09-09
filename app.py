import streamlit as st
import duckdb
import plotly.express as px

st.set_page_config(page_title="Majori Telemetry", layout="wide")
st.title("📊 Majori Telemetry Dashboard")

try:
    df = duckdb.query("SELECT * FROM 'data/parquet/*.parquet'").df()

    col1, col2 = st.columns(2)
    col1.metric(label="Total Événements", value=len(df))

    st.subheader("Données brutes")
    st.dataframe(df, use_container_width=True)

    if 'type' in df.columns:
        st.subheader("Répartition par type d'événement")
        fig = px.bar(df, x='type', title="Nombre d'événements par type")
        st.plotly_chart(fig, use_container_width=True)
except Exception as e:
    st.error(f"Erreur lors de la lecture des fichiers Parquet : {e}")
