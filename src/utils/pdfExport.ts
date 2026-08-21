import jsPDF from 'jspdf';

export function exportItemToPDF(type: 'favori' | 'memoire' | 'rappel' | 'tache' | 'conversation' | 'transcription', item: any) {
  const doc = new jsPDF();

  // Dark elegant styling
  doc.setFillColor(8, 15, 30);
  doc.rect(0, 0, 210, 297, 'F');

  // Header Banner
  doc.setFillColor(56, 189, 248);
  doc.rect(14, 14, 182, 3, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text('MajorI.A - DOCUMENT & RAPPORT', 14, 26);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(10);
  doc.text(`TYPE : ${type.toUpperCase()} | DATE : ${new Date().toLocaleDateString('fr-FR')} | SÉCURISÉ`, 14, 33);

  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(0.5);
  doc.line(14, 38, 196, 38);

  // Content
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  const title = item.titre || item.contenu?.slice(0, 40) || item.texte?.slice(0, 40) || 'Document MajorI.A';
  doc.text(`Titre : ${title}`, 14, 48);

  doc.setFontSize(11);
  doc.setTextColor(203, 213, 225);

  let y = 58;

  if (item.categorie) {
    doc.text(`Catégorie : ${item.categorie}`, 14, y);
    y += 8;
  }
  if (item.priorite) {
    doc.text(`Priorité : ${item.priorite.toUpperCase()}`, 14, y);
    y += 8;
  }
  if (item.importance) {
    doc.text(`Niveau d'importance : ${'★'.repeat(item.importance)} (${item.importance}/5)`, 14, y);
    y += 8;
  }
  if (item.dateRappel || item.heure) {
    doc.text(`Échéance : ${item.dateRappel || ''} ${item.heure || ''}`, 14, y);
    y += 8;
  }
  if (item.status) {
    doc.text(`Statut : ${item.status}`, 14, y);
    y += 8;
  }
  if (item.tags && item.tags.length > 0) {
    doc.text(`Tags : ${item.tags.map((t: string) => `#${t}`).join(', ')}`, 14, y);
    y += 8;
  }

  y += 4;
  doc.setDrawColor(51, 65, 85);
  doc.line(14, y, 196, y);
  y += 10;

  doc.setTextColor(248, 250, 252);
  doc.setFontSize(11);

  if (type === 'conversation' && item.messages) {
    doc.text('Historique de la conversation :', 14, y);
    y += 8;
    for (const msg of item.messages) {
      if (y > 270) {
        doc.addPage();
        doc.setFillColor(8, 15, 30);
        doc.rect(0, 0, 210, 297, 'F');
        y = 20;
      }
      const roleLabel = msg.role === 'user' ? 'Utilisateur :' : 'MajorI.A :';
      doc.setTextColor(msg.role === 'user' ? 56 : 147, msg.role === 'user' ? 189 : 197, msg.role === 'user' ? 248 : 253);
      doc.text(roleLabel, 14, y);
      y += 6;

      doc.setTextColor(226, 232, 240);
      const splitMsg = doc.splitTextToSize(msg.contenu, 175);
      doc.text(splitMsg, 14, y);
      y += splitMsg.length * 6 + 4;
    }
  } else {
    const detailText = item.description || item.contenu || item.texte || '';
    if (detailText) {
      doc.text('Contenu détaillé :', 14, y);
      y += 8;
      const splitText = doc.splitTextToSize(detailText, 175);
      doc.setTextColor(226, 232, 240);
      doc.text(splitText, 14, y);
    }
  }

  // Footer
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text('Généré par MajorI.A - Assistant Personnel Intelligent', 14, 285);

  const filename = `majoria-${type}-${item.id || Date.now()}.pdf`;
  doc.save(filename);
}
