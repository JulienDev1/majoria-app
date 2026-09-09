import streamlit as st
import duckdb
import plotly.express as px

st.set_page_config(page_title="Télémétrie 3D - Majori", layout="wide")

st.title("🛰️ Télémétrie 3D - Majori Assistant")
st.markdown("Visualisation interactive en temps réel des événements stockés localement.")

@st.cache_data
def load_data():
    return duckdb.sql("""
        SELECT 
            id, 
            events->>'action' AS action,
            events->>'status' AS status
        FROM 'pipeline/telemetry.parquet'
    """).df()

df = load_data()

if df.empty:
    st.warning("Aucune donnée trouvée dans le fichier Parquet.")
else:
    df['index_seq'] = range(len(df))
    df['action_code'] = df['action'].astype('category').cat.codes
    df['status_code'] = df['status'].astype('category').cat.codes

    fig = px.scatter_3d(
        df, 
        x='index_seq', 
        y='action_code', 
        z='status_code',
        color='status',
        hover_data=['id', 'action', 'status'],
        title="Nuage de points 3D - Événements de Télémétrie"
    )
    
    fig.update_layout(
        scene = {
            'xaxis_title': 'Séquence (Index)',
            'yaxis_title': 'Action (Code)',
            'zaxis_title': 'Statut (Code)'
        },
        margin=dict(l=0, r=0, b=0, t=40)
    )

    st.plotly_chart(fig, use_container_width=True)
    
    st.subheader("Données brutes")
    st.dataframe(df)
