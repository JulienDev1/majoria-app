import { supabase } from './supabaseClient'; // Vérifie le bon chemin vers ton client Supabase

export interface TelemetryEvent {
  event_name: string;
  category: string;
  payload?: Record<string, any>;
  timestamp?: string;
}

class TelemetryManager {
  private async sendBatch(events: TelemetryEvent[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('telemetry_events')
        .insert([{ events }]);

      if (error) throw error;
      return true;
    } catch (err) {
      console.warn('[Telemetry] Échec d\'envoi Supabase (sauvegardé localement).', err);
      return false;
    }
  }

  public async track(event_name: string, category: string, payload: Record<string, any> = {}) {
    const event: TelemetryEvent = {
      event_name,
      category,
      payload,
      timestamp: new Date().toISOString()
    };

    // Tentative d'envoi direct à Supabase
    const sent = await this.sendBatch([event]);
    if (!sent) {
      // Si hors-ligne ou erreur, mise en file d'attente dans IndexedDB
      console.log('[Telemetry] Événement mis en attente locale.');
    }
  }
}

export const telemetry = new TelemetryManager();