import os
import json
import pandas as pd
from datetime import datetime
from supabase import create_client, Client

# Configuration Supabase (à adapter ou charger via variables d'environnement)
SUPABASE_URL = os.getenv("VITE_SUPABASE_URL", "https://zpexcvuanzzkvkpvtcgn.supabase.co")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY", "sb_publishable_Xuwkx81HXG3X8C0krEg7xQ_Qw_Ayz4s")

def fetch_telemetry_from_supabase() -> pd.DataFrame:
    """Récupère les événements de la table telemetry_events sur Supabase."""
    print("Connexion à Supabase...")
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    response = supabase.table("telemetry_events").select("*").execute()
    records = response.data
    
    if not records:
        print("Aucun événement trouvé dans Supabase.")
        return pd.DataFrame()

    print(f"Récupération de {len(records)} entrées Supabase.")
    
    # Aplatir les événements reçus
    flattened_events = []
    for row in records:
        db_id = row.get("id")
        created_at = row.get("created_at")
        events_list = row.get("events", [])
        
        # Si events est une chaîne JSON, la charger
        if isinstance(events_list, str):
            events_list = json.loads(events_list)
            
        for evt in events_list:
            flattened_events.append({
                "db_id": db_id,
                "ingested_at": created_at,
                "event_name": evt.get("event_name"),
                "category": evt.get("category"),
                "timestamp": evt.get("timestamp"),
                "payload": json.dumps(evt.get("payload", {}))
            })
            
    return pd.DataFrame(flattened_events)

def run_pipeline():
    """Exécute le pipeline ETL : extraction Supabase -> export Parquet."""
    df = fetch_telemetry_from_supabase()
    
    if df.empty:
        print("Pipeline terminé sans données.")
        return
        
    # Créer le dossier data/raw si inexistant
    output_dir = os.path.join(os.path.dirname(__file__), "..", "data", "raw")
    os.makedirs(output_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = os.path.join(output_dir, f"telemetry_{timestamp}.parquet")
    
    # Sauvegarde au format Parquet
    df.to_parquet(output_file, index=False)
    print(f"Données enregistrées avec succès dans : {output_file}")

if __name__ == "__main__":
    run_pipeline()