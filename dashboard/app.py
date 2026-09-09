import streamlit as st
import duckdb
import plotly.express as px

st.set_page_config(page_title="Majori Telemetry", layout="wide")
st.title("📊 Majori Telemetry Dashboard")

# Connexion DuckDB aux fichiers Parquet
try:
    df = duckdb.query("SELECT * FROM 'data/parquet/*.parquet'").df()

    st.metric(label="Total Événements", value=len(df))
    st.dataframe(df, use_container_width=True)

    if 'type' in df.columns:
        fig = px.bar(df, x='type', title="Répartition des Événements par Type")
        st.plotly_chart(fig, use_container_width=True)
except Exception as e:
    st.error(f"Aucune donnée trouvée ou erreur DuckDB : {e}")
