export type Language = 'fr' | 'en';

export interface TranslationsSchema {
  common: {
    save: string;
    cancel: string;
    close: string;
    delete: string;
    edit: string;
    loading: string;
    enter: string;
    ok: string;
    yes: string;
    no: string;
    search: string;
    searchPlaceholder: string;
    online: string;
    offline: string;
    connected: string;
    disconnected: string;
    refresh: string;
    copy: string;
    copied: string;
    active: string;
    inactive: string;
    clear: string;
    export: string;
    import: string;
    actions: string;
    back: string;
    date: string;
    time: string;
    status: string;
    tags: string;
    category: string;
    all: string;
    filter: string;
    details: string;
    create: string;
    view: string;
    add: string;
    submit: string;
    confirmation: string;
    remove: string;
    success: string;
    error: string;
  };
  header: {
    appName: string;
    assistantBadge: string;
    online: string;
    confidentialActive: string;
    confidentialStandard: string;
    confidentialTitleActive: string;
    confidentialTitleInactive: string;
    voiceActive: string;
    voiceDisabled: string;
    voiceTitleActive: string;
    voiceTitleInactive: string;
    settingsTitle: string;
    batteryTitle: string;
    remaining: string;
    plansTitle: string;
    plansBtn: string;
    userTitle: string;
    login: string;
    searchPlaceholder: string;
    searchMobilePlaceholder: string;
    mobileBridgeTitle: string;
    mobileBridgeBtn: string;
    languageSelect: string;
    languageFr: string;
    languageEn: string;
    searchButton: string;
  };
  nav: {
    chat: string;
    transcription: string;
    favoris: string;
    memoire: string;
    rappels: string;
    taches: string;
    calendar: string;
    stats: string;
    plans: string;
    mobileBridge: string;
    newChat: string;
    searchConv: string;
    allCategories: string;
    general: string;
    work: string;
    personal: string;
    study: string;
    creative: string;
    code: string;
    deleteConfirm: string;
    rename: string;
    tags: string;
    clear: string;
    emptyConvs: string;
    categories: string;
    history: string;
  };
  chat: {
    welcome: string;
    welcomeTitle: string;
    welcomeDesc: string;
    welcomeSubtitle: string;
    askAnything: string;
    quickSuggestions: string;
    placeholder: string;
    inputPlaceholder: string;
    voiceRecording: string;
    stopRecording: string;
    clearChat: string;
    clearConv: string;
    exportChat: string;
    copyMessage: string;
    reply: string;
    regenerate: string;
    speakMessage: string;
    send: string;
    listening: string;
    transcribing: string;
    uploading: string;
    aiThinking: string;
    model: string;
    confidentialModeNotice: string;
    noMessages: string;
    importFile: string;
    visionMode: string;
    takePhoto: string;
    webSearch: string;
    transcribeAudio: string;
    fileAttached: string;
    fileTypeUnsupported: string;
    fileError: string;
    newDiscussion: string;
    exportPdf: string;
    batteryExhausted: string;
    recharge: string;
    mic: string;
    photoVideo: string;
  };
  transcription: {
    title: string;
    subtitle: string;
    startRecording: string;
    stopRecording: string;
    importAudio: string;
    transcribing: string;
    summarize: string;
    formatText: string;
    copyText: string;
    exportPdf: string;
    wordCount: string;
    duration: string;
    noTranscript: string;
    statusReady: string;
    statusRecording: string;
    statusProcessing: string;
    liveDictation: string;
    dictationInstructions: string;
    generateSummary: string;
    formattingAi: string;
  };
  favoris: {
    title: string;
    subtitle: string;
    searchFav: string;
    addFav: string;
    noFavoris: string;
    copy: string;
    remove: string;
    tags: string;
    category: string;
    all: string;
    favoriteSaved: string;
    favoriteDeleted: string;
  };
  memoire: {
    title: string;
    subtitle: string;
    searchMem: string;
    addMem: string;
    noMemories: string;
    key: string;
    value: string;
    category: string;
    delete: string;
    importance: string;
    addSuccess: string;
    removeSuccess: string;
  };
  rappels: {
    title: string;
    subtitle: string;
    searchRappels: string;
    addRappel: string;
    noRappels: string;
    date: string;
    time: string;
    endDate: string;
    endTime: string;
    status: string;
    completed: string;
    pending: string;
    snooze: string;
    pastDue: string;
    dueSoon: string;
  };
  taches: {
    title: string;
    subtitle: string;
    searchTasks: string;
    addTask: string;
    noTasks: string;
    priority: string;
    critique: string;
    haute: string;
    normale: string;
    basse: string;
    status: string;
    todo: string;
    inProgress: string;
    done: string;
    deleteTask: string;
  };
  calendar: {
    title: string;
    subtitle: string;
    today: string;
    month: string;
    week: string;
    day: string;
    newEvent: string;
    noEvents: string;
    scheduleReminder: string;
    tasksScheduled: string;
  };
  stats: {
    title: string;
    subtitle: string;
    totalMessages: string;
    tokensUsed: string;
    energyConsumed: string;
    activityChart: string;
    dailyUsage: string;
    conversationsCount: string;
    efficiency: string;
  };
  settings: {
    title: string;
    subtitle: string;
    appearance: string;
    galaxyBg: string;
    galaxySpeed: string;
    galaxyOpacity: string;
    voicePreferences: string;
    voiceGender: string;
    male: string;
    female: string;
    alertSound: string;
    confidentialMode: string;
    autoSpeak: string;
    save: string;
    close: string;
    profile: string;
    firstName: string;
    lastName: string;
    language: string;
    languageTitle: string;
    languageDesc: string;
    languageSection: string;
    languageDescription: string;
    languageFr: string;
    languageEn: string;
    dataManagement: string;
    exportJson: string;
    importJson: string;
    clearData: string;
    clearDataConfirm: string;
    theme: string;
    themeTitle: string;
    themeMode: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    themeToggle: string;
    themeModeDesc: string;
    sounds: string;
    notifications: string;
    profileSaved: string;
    testVoice: string;
    testingVoice: string;
    identityTitle: string;
    identityDesc: string;
    preview: string;
    previewPrompt: string;
    saveProfile: string;
    voiceTitle: string;
    voiceDesc: string;
    voiceFemale: string;
    voiceFemaleDesc: string;
    voiceMale: string;
    voiceMaleDesc: string;
    voiceListening: string;
    voiceListen: string;
    alertTitle: string;
    alertDesc: string;
    testSound: string;
    energyTitle: string;
    energyLevel: string;
    energyAvailable: string;
    rolloverTitle: string;
    rolloverCarried: string;
    rolloverDesc: string;
    totalEnergyAvailable: string;
    simulateRollover: string;
    quickRecharge: string;
    mobileBridgeTitle: string;
    mobileBridgeDesc: string;
    open: string;
    customImage: string;
    reset: string;
    resetZone: string;
    clearAllData: string;
  };
  pricing: {
    modalTitle: string;
    modalDesc: string;
    title: string;
    subtitle: string;
    free: string;
    pro: string;
    ultra: string;
    energyGauge: string;
    rollover: string;
    currentPlan: string;
    choosePlan: string;
    upgrade: string;
  };
  plans: {
    title: string;
    subtitle: string;
    popular: string;
    starter: string;
    pro: string;
    ultimate: string;
    perMonth: string;
    choosePlan: string;
    subscribe: string;
    rolloverNotice: string;
    activePlan: string;
    energyCapacity: string;
    reportMonthly: string;
  };
  auth: {
    title: string;
    subtitle: string;
    loginTitle: string;
    signupTitle: string;
    email: string;
    password: string;
    confirmPassword: string;
    signIn: string;
    signUp: string;
    logout: string;
    forgotPassword: string;
    loggedInAs: string;
    guest: string;
    connectSuccess: string;
    logoutSuccess: string;
  };
  mobileBridge: {
    title: string;
    subtitle: string;
    pairingCode: string;
    scanQr: string;
    connectedDevices: string;
    syncNow: string;
    disconnect: string;
    pairingSuccess: string;
  };
  errors: {
    generic: string;
    networkError: string;
    serverError: string;
    unauthorized: string;
    forbidden: string;
    quotaExceeded: string;
    fileTooLarge: string;
    invalidFile: string;
    transcriptionFailed: string;
    aiError: string;
    emptyInput: string;
    notFound: string;
  };
  toasts: {
    saved: string;
    deleted: string;
    updated: string;
    copied: string;
    error: string;
    success: string;
    warning: string;
    info: string;
    reminderAlert: string;
    voiceEnabled: string;
    voiceDisabled: string;
    confidentialEnabled: string;
    confidentialDisabled: string;
    languageChanged: string;
  };
}

export const translations: Record<Language, TranslationsSchema> = {
  fr: {
    common: {
      save: 'Enregistrer',
      cancel: 'Annuler',
      close: 'Fermer',
      delete: 'Supprimer',
      edit: 'Modifier',
      loading: 'Chargement en cours...',
      enter: 'Entrée',
      ok: 'OK',
      yes: 'Oui',
      no: 'Non',
      search: 'Rechercher',
      searchPlaceholder: 'Rechercher...',
      online: 'En ligne',
      offline: 'Hors ligne',
      connected: 'Connecté',
      disconnected: 'Déconnecté',
      refresh: 'Actualiser',
      copy: 'Copier',
      copied: 'Copié !',
      active: 'Actif',
      inactive: 'Inactif',
      clear: 'Effacer',
      export: 'Exporter',
      import: 'Importer',
      actions: 'Actions',
      back: 'Retour',
      date: 'Date',
      time: 'Heure',
      status: 'Statut',
      tags: 'Tags',
      category: 'Catégorie',
      all: 'Tous',
      filter: 'Filtrer',
      details: 'Détails',
      create: 'Créer',
      view: 'Afficher',
      add: 'Ajouter',
      submit: 'Valider',
      confirmation: 'Confirmation',
      remove: 'Retirer',
      success: 'Succès',
      error: 'Erreur',
    },
    header: {
      appName: 'MajorI.A',
      assistantBadge: 'Assistant',
      online: 'En ligne',
      confidentialActive: 'Confidentiel',
      confidentialStandard: 'Standard',
      confidentialTitleActive: 'Mode confidentiel actif (anonymisation maximale)',
      confidentialTitleInactive: 'Activer le mode confidentiel',
      voiceActive: 'Lecture vocale active',
      voiceDisabled: 'Lecture vocale désactivée',
      voiceTitleActive: 'Désactiver la lecture vocale automatique',
      voiceTitleInactive: 'Activer la lecture vocale automatique',
      settingsTitle: "Paramètres d'apparence, Voix, Profil & Langue",
      batteryTitle: 'Consommation & Énergie restante',
      remaining: 'IA restant',
      plansTitle: 'Consulter les Forfaits & Tarifs avec Report Mensuel Inclus',
      plansBtn: 'Forfaits',
      userTitle: 'Gestion du compte et profil',
      login: 'Connexion',
      searchPlaceholder: 'Rechercher (favoris, mémoires, tâches...)',
      searchMobilePlaceholder: 'Rechercher mémoires, favoris, tâches...',
      mobileBridgeTitle: 'Pont Mobile & Compagnon Téléphone',
      mobileBridgeBtn: 'Pont Mobile',
      languageSelect: 'Changer de langue (FR / EN)',
      languageFr: 'Français',
      languageEn: 'English',
      searchButton: 'OK',
    },
    nav: {
      chat: 'Chat & Assistant',
      transcription: 'Transcription Vocale',
      favoris: 'Mes Favoris',
      memoire: 'Mémoire & Notes',
      rappels: 'Rappels',
      taches: 'Tâches & Projets',
      calendar: 'Agenda',
      stats: 'Statistiques',
      plans: 'Forfaits & Énergie',
      mobileBridge: 'Pont Mobile',
      newChat: 'Nouvelle discussion',
      searchConv: 'Filtrer discussions...',
      allCategories: 'Toutes les catégories',
      general: 'Général',
      work: 'Travail',
      personal: 'Perso',
      study: 'Études',
      creative: 'Créatif',
      code: 'Code & Dev',
      deleteConfirm: 'Voulez-vous vraiment supprimer cette conversation ?',
      rename: 'Renommer',
      tags: 'Gérer les tags',
      clear: 'Effacer',
      emptyConvs: 'Aucune discussion trouvée',
      categories: 'Catégories',
      history: 'Discussions',
    },
    chat: {
      welcome: 'Bonjour et bienvenue',
      welcomeTitle: 'MajorI.A // Matrice Cognitive',
      welcomeDesc: 'Je suis MajorI.A, votre assistant intelligent. Posez-moi une question, dictez vocalement ou téléversez un document.',
      welcomeSubtitle: 'Assistant neural d’élite prêt pour vos requêtes, analyses de documents, vision et automatisation.',
      askAnything: 'Posez une question ou donnez une instruction...',
      quickSuggestions: 'Suggestions rapides :',
      placeholder: 'Écrire à MajorI.A...',
      inputPlaceholder: 'Écrire à MajorI.A...',
      voiceRecording: 'Enregistrement en cours...',
      stopRecording: 'Arrêter l’enregistrement',
      clearChat: 'Effacer la discussion',
      clearConv: 'Effacer la discussion',
      exportChat: 'Exporter la conversation',
      copyMessage: 'Copier la réponse',
      reply: 'Répondre',
      regenerate: 'Régénérer la réponse',
      speakMessage: 'Écouter la réponse à haute voix',
      send: 'Envoyer',
      listening: 'Écoute en cours... Parlez maintenant !',
      transcribing: 'Transcription IA en cours...',
      uploading: 'Chargement du fichier...',
      aiThinking: 'MajorI.A réfléchit et synthétise...',
      model: 'Modèle Neural MajorI.A Pro',
      confidentialModeNotice: 'Mode confidentiel actif : Les données sensibles sont masquées avant traitement.',
      noMessages: 'Démarrez une nouvelle conversation ou sélectionnez une requête rapide.',
      importFile: 'Joindre un fichier (PDF, TXT, Image)',
      visionMode: 'Analyse d’image activée',
      takePhoto: 'Prendre une photo',
      webSearch: 'Recherche Web en temps réel',
      transcribeAudio: 'Transcrire un audio',
      fileAttached: 'Fichier joint',
      fileTypeUnsupported: 'Format de fichier non pris en charge.',
      fileError: 'Erreur lors de la lecture du fichier.',
      newDiscussion: 'Nouvelle discussion',
      exportPdf: 'Exporter en PDF',
      batteryExhausted: 'Batterie IA déchargée (0% restant). Rechargez pour débloquer l’envoi.',
      recharge: 'Recharger',
      mic: 'Micro',
      photoVideo: 'Photo/Vidéo',
    },
    transcription: {
      title: 'Transcription & Dictée Vocale',
      subtitle: 'Enregistrez, transcrivez et structurez instantanément vos réunions, notes et idées audio.',
      startRecording: 'Démarrer l’enregistrement vocal',
      stopRecording: 'Arrêter & Transcrire',
      importAudio: 'Importer un fichier audio (MP3, WAV, M4A)',
      transcribing: 'Transcription neurale en cours...',
      summarize: 'Synthétiser avec MajorI.A',
      formatText: 'Corriger & Mettre en forme',
      copyText: 'Copier le texte complet',
      exportPdf: 'Exporter le compte-rendu en PDF',
      wordCount: 'Mots',
      duration: 'Durée',
      noTranscript: 'Aucune transcription active. Lancez un enregistrement ou déposez un fichier audio.',
      statusReady: 'Microphone prêt',
      statusRecording: 'Enregistrement en direct...',
      statusProcessing: 'Analyse acoustique...',
      liveDictation: 'Dictée vocale en direct',
      dictationInstructions: 'Parlez distinctement dans votre microphone.',
      generateSummary: 'Générer une synthèse',
      formattingAi: 'Mise en page intelligente par IA',
    },
    favoris: {
      title: 'Mes Favoris',
      subtitle: 'Retrouvez facilement les réponses majeures, prompts et notes sauvegardés.',
      searchFav: 'Rechercher parmi les favoris...',
      addFav: 'Ajouter aux favoris',
      noFavoris: 'Aucun favori enregistré pour le moment.',
      copy: 'Copier le favori',
      remove: 'Retirer des favoris',
      tags: 'Étiquettes',
      category: 'Catégorie',
      all: 'Tous',
      favoriteSaved: 'Favori ajouté avec succès !',
      favoriteDeleted: 'Favori supprimé.',
    },
    memoire: {
      title: 'Mémoire & Notes',
      subtitle: 'Données contextuelles retenues par MajorI.A pour personnaliser ses réponses.',
      searchMem: 'Rechercher dans la mémoire...',
      addMem: 'Mémoriser un fait ou une consigne',
      noMemories: 'Aucun souvenir enregistré dans la mémoire persistante.',
      key: 'Clé / Contexte',
      value: 'Information retenue',
      category: 'Domaine',
      delete: 'Oublier cette information',
      importance: 'Niveau d’importance',
      addSuccess: 'Information mémorisée par MajorI.A.',
      removeSuccess: 'Information effacée de la mémoire.',
    },
    rappels: {
      title: 'Rappels',
      subtitle: 'Ne manquez aucune échéance avec des alertes sonores et visuelles synchronisées.',
      searchRappels: 'Rechercher un rappel...',
      addRappel: 'Nouveau rappel',
      noRappels: 'Aucun rappel programmé.',
      date: 'Date de début / d’échéance',
      time: 'Heure de début',
      endDate: 'Date de fin',
      endTime: 'Heure de fin',
      status: 'Statut',
      completed: 'Terminé',
      pending: 'En attente',
      snooze: 'Reporter de 10 min',
      pastDue: 'En retard',
      dueSoon: 'Imminent',
    },
    taches: {
      title: 'Tâches & Projets',
      subtitle: 'Suivez vos objectifs et organisez vos priorités du quotidien.',
      searchTasks: 'Filtrer les tâches...',
      addTask: 'Ajouter une tâche',
      noTasks: 'Toutes les tâches sont terminées !',
      priority: 'Priorité',
      critique: 'Critique',
      haute: 'Haute',
      normale: 'Normale',
      basse: 'Basse',
      status: 'Statut',
      todo: 'À faire',
      inProgress: 'En cours',
      done: 'Terminée',
      deleteTask: 'Supprimer la tâche',
    },
    calendar: {
      title: 'Agenda',
      subtitle: 'Vue d’ensemble de vos échéances, rendez-vous et jalons.',
      today: 'Aujourd’hui',
      month: 'Mois',
      week: 'Semaine',
      day: 'Jour',
      newEvent: 'Nouvel événement',
      noEvents: 'Aucun événement pour cette journée.',
      scheduleReminder: 'Planifier un rappel',
      tasksScheduled: 'Tâches planifiées',
    },
    stats: {
      title: 'Statistiques',
      subtitle: 'Analyse de votre productivité et de l’utilisation du moteur neuronal.',
      totalMessages: 'Messages échangés',
      tokensUsed: 'Tokens traités',
      energyConsumed: 'Énergie consommée',
      activityChart: 'Activité récente',
      dailyUsage: 'Utilisation quotidienne',
      conversationsCount: 'Discussions actives',
      efficiency: 'Indice d’efficacité',
    },
    settings: {
      title: 'Paramètres & Personnalisation',
      subtitle: 'Personnalisez votre expérience, voix, interface et données.',
      appearance: 'Apparence & Arrière-plan',
      galaxyBg: 'Arrière-plan galactique interactif',
      galaxySpeed: 'Vitesse de rotation',
      galaxyOpacity: 'Opacité de la galaxie',
      voicePreferences: 'Synthèse Vocale & Audio',
      voiceGender: 'Genre de la voix IA',
      male: 'Voix Masculine',
      female: 'Voix Féminine',
      alertSound: 'Sonnerie des alertes',
      confidentialMode: 'Mode Confidentiel par défaut',
      autoSpeak: 'Lecture automatique des réponses',
      save: 'Enregistrer les modifications',
      close: 'Fermer',
      profile: 'Profil Utilisateur',
      firstName: 'Prénom',
      lastName: 'Nom',
      language: 'Langue de l’interface',
      languageTitle: 'Langue de l’interface (Language)',
      languageDesc: 'Français ou Anglais',
      languageSection: 'Langue & Internationalisation',
      languageDescription: 'Choisissez la langue principale de l’interface MajorI.A (Français ou Anglais).',
      languageFr: 'Français (FR)',
      languageEn: 'English (EN)',
      dataManagement: 'Gestion des Données & Sauvegarde',
      exportJson: 'Exporter toutes les données (JSON)',
      importJson: 'Importer une sauvegarde (JSON)',
      clearData: 'Réinitialiser toutes les données locales',
      clearDataConfirm: 'Attention : toutes vos discussions, tâches et favoris seront définitivement effacés.',
      theme: 'Thème & Couleurs',
      themeTitle: 'Arrière-plan & Thème',
      themeMode: 'Mode d’affichage',
      themeLight: 'Mode Clair (Light)',
      themeDark: 'Mode Sombre (Dark)',
      themeSystem: 'Automatique (Système)',
      themeToggle: 'Basculer le thème',
      themeModeDesc: 'Alternez entre le mode clair et le mode sombre pour un confort visuel optimal.',
      sounds: 'Effets Sonores Cyber',
      notifications: 'Notifications du navigateur',
      profileSaved: 'Profil sauvegardé ! Le chatbot utilisera votre prénom.',
      testVoice: 'Tester la voix',
      testingVoice: 'Test de la voix en cours...',
      identityTitle: 'Identité & Profil (Utilisé par le Chatbot)',
      identityDesc: 'MajorI.A s’adressera à vous personnellement',
      preview: 'Prévisualisation',
      previewPrompt: 'Saisissez votre prénom pour personnaliser l’accueil',
      saveProfile: 'Enregistrer le profil',
      voiceTitle: 'Personnalisation de la Voix Synthétique',
      voiceDesc: 'Synthèse vocale en direct',
      voiceFemale: 'Voix Féminine',
      voiceFemaleDesc: 'Tonalité douce, fluide et chaleureuse',
      voiceMale: 'Voix Masculine',
      voiceMaleDesc: 'Tonalité posée, claire et assurée',
      voiceListening: 'Lecture de l’exemple...',
      voiceListen: 'Écouter un extrait de la voix',
      alertTitle: 'Système de Notifications & Son des Alertes',
      alertDesc: 'Rappels & Événements',
      testSound: 'Cliquer pour tester',
      energyTitle: 'Système de Consommation & Report Mensuel Automatique',
      energyLevel: 'Niveau de Batterie IA',
      energyAvailable: 'disponible',
      rolloverTitle: 'Report automatique garanti',
      rolloverCarried: 'reporté du mois précédent',
      rolloverDesc: 'Toute l’énergie non consommée à la fin de chaque mois est automatiquement conservée et reportée sur le mois suivant.',
      totalEnergyAvailable: 'Total cumulé disponible',
      simulateRollover: 'Simuler le report mensuel',
      quickRecharge: 'Recharge rapide',
      mobileBridgeTitle: 'Pont Mobile & Compagnon Téléphone',
      mobileBridgeDesc: 'Associez votre iPhone ou Android pour les alertes mobiles',
      open: 'Ouvrir',
      customImage: 'Image personnalisée',
      reset: 'Réinitialiser',
      resetZone: 'Zone de réinitialisation',
      clearAllData: 'Effacer toutes les données',
    },
    pricing: {
      modalTitle: 'Formules & Consommation d’Énergie IA',
      modalDesc: 'Passez à la formule supérieure ou gérez vos options de facturation Stripe',
      title: 'Formules & Abonnements',
      subtitle: 'Report automatique de l’énergie non consommée chaque mois',
      free: 'Gratuit',
      pro: 'Professionnel',
      ultra: 'Ultra Cyber',
      energyGauge: 'Jauge d’énergie IA',
      rollover: 'Report mensuel automatique garanti',
      currentPlan: 'Votre forfait actuel',
      choosePlan: 'Choisir cette formule',
      upgrade: 'Passer au niveau supérieur',
    },
    plans: {
      title: 'Forfaits & Capacité Énergétique',
      subtitle: 'Accédez à plus de puissance de calcul et bénéficiez du report mensuel automatique de l’énergie non utilisée.',
      popular: 'Recommandé',
      starter: 'Starter',
      pro: 'Professionnel',
      ultimate: 'Ultimate Cyber',
      perMonth: '/ mois',
      choosePlan: 'Sélectionner ce forfait',
      subscribe: 'Souscrire maintenant',
      rolloverNotice: '⚡ Report d’énergie inclus : Votre énergie non consommée est reportée sur le mois suivant !',
      activePlan: 'Forfait Actif',
      energyCapacity: 'Capacité énergétique mensuelle',
      reportMonthly: 'Report automatique chaque 1er du mois',
    },
    auth: {
      title: 'Authentification & Compte',
      subtitle: 'Synchronisez vos données sur tous vos appareils en toute sécurité.',
      loginTitle: 'Se connecter',
      signupTitle: 'Créer un compte',
      email: 'Adresse Email',
      password: 'Mot de passe',
      confirmPassword: 'Confirmer le mot de passe',
      signIn: 'Connexion',
      signUp: 'Inscription',
      logout: 'Déconnexion',
      forgotPassword: 'Mot de passe oublié ?',
      loggedInAs: 'Connecté en tant que',
      guest: 'Mode Invité (Données locales uniquement)',
      connectSuccess: 'Connexion réussie ! Vos données sont synchronisées.',
      logoutSuccess: 'Vous avez été déconnecté.',
    },
    mobileBridge: {
      title: 'Pont Mobile & Compagnon Téléphone',
      subtitle: 'Associez votre smartphone en scannant le QR code ou en saisissant le code sécurisé.',
      pairingCode: 'Code d’association sécurisé',
      scanQr: 'Scannez le code avec votre mobile',
      connectedDevices: 'Appareils connectés',
      syncNow: 'Synchroniser immédiatement',
      disconnect: 'Dissocier l’appareil',
      pairingSuccess: 'Smartphone connecté avec succès !',
    },
    errors: {
      generic: 'Une erreur inattendue est survenue. Veuillez réessayer.',
      networkError: 'Connexion réseau instable ou indisponible.',
      serverError: 'Le serveur distant a renvoyé une erreur.',
      unauthorized: 'Accès non autorisé. Veuillez vous reconnecter.',
      forbidden: 'Action refusée.',
      quotaExceeded: 'Capacité d’énergie mensuelle atteinte. Veuillez recharger votre forfait.',
      fileTooLarge: 'Le fichier dépasse la taille maximale autorisée (10 Mo).',
      invalidFile: 'Format de fichier non reconnu.',
      transcriptionFailed: 'Échec de la transcription audio. Vérifiez le microphone ou le format.',
      aiError: 'Erreur lors de la génération de la réponse IA.',
      emptyInput: 'Veuillez saisir un message avant d’envoyer.',
      notFound: 'Élément introuvable.',
    },
    toasts: {
      saved: 'Modifications enregistrées !',
      deleted: 'Élément supprimé avec succès.',
      updated: 'Mise à jour effectuée.',
      copied: 'Copié dans le presse-papier !',
      error: 'Une erreur s’est produite.',
      success: 'Opération réussie !',
      warning: 'Attention :',
      info: 'Information :',
      reminderAlert: '🔔 Rappel d’échéance !',
      voiceEnabled: 'Lecture vocale automatique activée.',
      voiceDisabled: 'Lecture vocale désactivée.',
      confidentialEnabled: 'Mode confidentiel activé.',
      confidentialDisabled: 'Mode confidentiel désactivé.',
      languageChanged: 'Langue modifiée : Français.',
    },
  },
  en: {
    common: {
      save: 'Save',
      cancel: 'Cancel',
      close: 'Close',
      delete: 'Delete',
      edit: 'Edit',
      loading: 'Loading...',
      enter: 'Enter',
      ok: 'OK',
      yes: 'Yes',
      no: 'No',
      search: 'Search',
      searchPlaceholder: 'Search...',
      online: 'Online',
      offline: 'Offline',
      connected: 'Connected',
      disconnected: 'Disconnected',
      refresh: 'Refresh',
      copy: 'Copy',
      copied: 'Copied!',
      active: 'Active',
      inactive: 'Inactive',
      clear: 'Clear',
      export: 'Export',
      import: 'Import',
      actions: 'Actions',
      back: 'Back',
      date: 'Date',
      time: 'Time',
      status: 'Status',
      tags: 'Tags',
      category: 'Category',
      all: 'All',
      filter: 'Filter',
      details: 'Details',
      create: 'Create',
      view: 'View',
      add: 'Add',
      submit: 'Submit',
      confirmation: 'Confirmation',
      remove: 'Remove',
      success: 'Success',
      error: 'Error',
    },
    header: {
      appName: 'MajorI.A',
      assistantBadge: 'Assistant',
      online: 'Online',
      confidentialActive: 'Confidential',
      confidentialStandard: 'Standard',
      confidentialTitleActive: 'Confidential mode enabled (maximum anonymization)',
      confidentialTitleInactive: 'Enable confidential mode',
      voiceActive: 'Voice auto-speak active',
      voiceDisabled: 'Voice auto-speak disabled',
      voiceTitleActive: 'Disable automatic voice response reading',
      voiceTitleInactive: 'Enable automatic voice response reading',
      settingsTitle: 'Settings: Appearance, Voice, Profile & Language',
      batteryTitle: 'AI Energy & Consumption remaining',
      remaining: 'AI remaining',
      plansTitle: 'View Plans & Pricing with Guaranteed Monthly Rollover',
      plansBtn: 'Plans',
      userTitle: 'Account & User Profile management',
      login: 'Login',
      searchPlaceholder: 'Search (favorites, memories, tasks...)',
      searchMobilePlaceholder: 'Search memories, favorites, tasks...',
      mobileBridgeTitle: 'Mobile Bridge & Phone Companion',
      mobileBridgeBtn: 'Mobile Bridge',
      languageSelect: 'Switch language (FR / EN)',
      languageFr: 'Français',
      languageEn: 'English',
      searchButton: 'OK',
    },
    nav: {
      chat: 'Chat & Assistant',
      transcription: 'Voice Dictation',
      favoris: 'My Favorites',
      memoire: 'Memory & Notes',
      rappels: 'Reminders',
      taches: 'Tasks & Projects',
      calendar: 'Calendar',
      stats: 'Statistics',
      plans: 'Plans & Energy',
      mobileBridge: 'Mobile Bridge',
      newChat: 'New Chat',
      searchConv: 'Filter discussions...',
      allCategories: 'All Categories',
      general: 'General',
      work: 'Work',
      personal: 'Personal',
      study: 'Study',
      creative: 'Creative',
      code: 'Code & Dev',
      deleteConfirm: 'Are you sure you want to delete this discussion?',
      rename: 'Rename',
      tags: 'Manage Tags',
      clear: 'Clear',
      emptyConvs: 'No conversations found',
      categories: 'Categories',
      history: 'Discussions',
    },
    chat: {
      welcome: 'Welcome',
      welcomeTitle: 'MajorI.A // Cognitive Matrix',
      welcomeDesc: 'I am MajorI.A, your intelligent assistant. Ask me questions, dictate by voice, or upload files.',
      welcomeSubtitle: 'Elite neural assistant ready for queries, document intelligence, vision, and automation.',
      askAnything: 'Ask a question or provide an instruction...',
      quickSuggestions: 'Quick suggestions:',
      placeholder: 'Write to MajorI.A...',
      inputPlaceholder: 'Write to MajorI.A...',
      voiceRecording: 'Recording audio...',
      stopRecording: 'Stop recording',
      clearChat: 'Clear discussion',
      clearConv: 'Clear discussion',
      exportChat: 'Export conversation',
      copyMessage: 'Copy response',
      reply: 'Reply',
      regenerate: 'Regenerate response',
      speakMessage: 'Listen out loud',
      send: 'Send',
      listening: 'Listening... Speak now!',
      transcribing: 'AI Transcribing audio...',
      uploading: 'Uploading file...',
      aiThinking: 'MajorI.A is processing and thinking...',
      model: 'MajorI.A Pro Neural Model',
      confidentialModeNotice: 'Confidential mode active: Sensitive data masked prior to analysis.',
      noMessages: 'Start a new conversation or choose a quick prompt above.',
      importFile: 'Attach file (PDF, TXT, Image)',
      visionMode: 'Vision Analysis Active',
      takePhoto: 'Take a Photo',
      webSearch: 'Real-time Web Search',
      transcribeAudio: 'Transcribe Audio',
      fileAttached: 'File attached',
      fileTypeUnsupported: 'Unsupported file format.',
      fileError: 'Error reading file.',
      newDiscussion: 'New Discussion',
      exportPdf: 'Export to PDF',
      batteryExhausted: 'AI Battery is empty (0% remaining). Recharge to send messages.',
      recharge: 'Recharge',
      mic: 'Mic',
      photoVideo: 'Photo/Video',
    },
    transcription: {
      title: 'Transcription & Audio Dictation',
      subtitle: 'Record, transcribe, and structure your audio meetings and notes instantly.',
      startRecording: 'Start Voice Recording',
      stopRecording: 'Stop & Transcribe',
      importAudio: 'Import audio file (MP3, WAV, M4A)',
      transcribing: 'Neural transcription in progress...',
      summarize: 'Summarize with MajorI.A',
      formatText: 'Clean & Format Text',
      copyText: 'Copy full transcript',
      exportPdf: 'Export report to PDF',
      wordCount: 'Words',
      duration: 'Duration',
      noTranscript: 'No active transcription. Start recording or upload an audio file.',
      statusReady: 'Microphone ready',
      statusRecording: 'Live recording in progress...',
      statusProcessing: 'Processing acoustic data...',
      liveDictation: 'Live Speech-to-Text',
      dictationInstructions: 'Speak clearly into your microphone.',
      generateSummary: 'Generate AI Summary',
      formattingAi: 'AI Smart Formatting',
    },
    favoris: {
      title: 'My Favorites',
      subtitle: 'Quickly access saved answers, prompts, and notes.',
      searchFav: 'Search favorites...',
      addFav: 'Add to favorites',
      noFavoris: 'No favorites saved yet.',
      copy: 'Copy favorite',
      remove: 'Remove from favorites',
      tags: 'Tags',
      category: 'Category',
      all: 'All',
      favoriteSaved: 'Saved to favorites!',
      favoriteDeleted: 'Favorite removed.',
    },
    memoire: {
      title: 'Memory & Notes',
      subtitle: 'Contextual facts remembered by MajorI.A to personalize future answers.',
      searchMem: 'Search memory...',
      addMem: 'Remember a fact or rule',
      noMemories: 'No memories saved in persistent storage.',
      key: 'Key / Context',
      value: 'Saved fact',
      category: 'Domain',
      delete: 'Forget this memory',
      importance: 'Importance Level',
      addSuccess: 'Information stored in memory.',
      removeSuccess: 'Information removed from memory.',
    },
    rappels: {
      title: 'Reminders',
      subtitle: 'Never miss a deadline with synchronized sound and visual alerts.',
      searchRappels: 'Search reminders...',
      addRappel: 'New reminder',
      noRappels: 'No scheduled reminders.',
      date: 'Start / Due Date',
      time: 'Start Time',
      endDate: 'End Date',
      endTime: 'End Time',
      status: 'Status',
      completed: 'Completed',
      pending: 'Pending',
      snooze: 'Snooze 10m',
      pastDue: 'Past Due',
      dueSoon: 'Due Soon',
    },
    taches: {
      title: 'Tasks & Projects',
      subtitle: 'Track your goals and organize daily priorities.',
      searchTasks: 'Filter tasks...',
      addTask: 'Add a task',
      noTasks: 'All tasks completed!',
      priority: 'Priority',
      critique: 'Critical',
      haute: 'High',
      normale: 'Normal',
      basse: 'Low',
      status: 'Status',
      todo: 'To Do',
      inProgress: 'In Progress',
      done: 'Done',
      deleteTask: 'Delete task',
    },
    calendar: {
      title: 'Calendar',
      subtitle: 'Overview of your events, deadlines, and milestones.',
      today: 'Today',
      month: 'Month',
      week: 'Week',
      day: 'Day',
      newEvent: 'New Event',
      noEvents: 'No events scheduled for this day.',
      scheduleReminder: 'Schedule reminder',
      tasksScheduled: 'Scheduled tasks',
    },
    stats: {
      title: 'Statistics',
      subtitle: 'Productivity analytics and neural engine usage.',
      totalMessages: 'Messages Exchanged',
      tokensUsed: 'Tokens Processed',
      energyConsumed: 'Energy Consumed',
      activityChart: 'Recent Activity',
      dailyUsage: 'Daily Usage',
      conversationsCount: 'Active Discussions',
      efficiency: 'Efficiency Rating',
    },
    settings: {
      title: 'Settings & Customization',
      subtitle: 'Customize your experience, voice, theme, and data.',
      appearance: 'Appearance & Background',
      galaxyBg: 'Interactive Galactic Background',
      galaxySpeed: 'Rotation Speed',
      galaxyOpacity: 'Galaxy Opacity',
      voicePreferences: 'Voice & Audio',
      voiceGender: 'AI Voice Gender',
      male: 'Male Voice',
      female: 'Female Voice',
      alertSound: 'Alert Ringtone',
      confidentialMode: 'Default Confidential Mode',
      autoSpeak: 'Auto-speak AI responses',
      save: 'Save Changes',
      close: 'Close',
      profile: 'User Profile',
      firstName: 'First Name',
      lastName: 'Last Name',
      language: 'Interface Language',
      languageTitle: 'Interface Language',
      languageDesc: 'French or English',
      languageSection: 'Language & Internationalization',
      languageDescription: 'Choose the main language of MajorI.A interface (French or English).',
      languageFr: 'Français (FR)',
      languageEn: 'English (EN)',
      dataManagement: 'Data Management & Backup',
      exportJson: 'Export all data (JSON)',
      importJson: 'Import backup (JSON)',
      clearData: 'Reset all local data',
      clearDataConfirm: 'Warning: All discussions, tasks, and notes will be permanently erased.',
      theme: 'Theme & Colors',
      themeTitle: 'Background & Theme',
      themeMode: 'Display Mode',
      themeLight: 'Light Mode',
      themeDark: 'Dark Mode',
      themeSystem: 'Automatic (System)',
      themeToggle: 'Toggle Theme',
      themeModeDesc: 'Switch between light mode and dark mode for optimal visual comfort.',
      sounds: 'Cyber Sound Effects',
      notifications: 'Browser Notifications',
      profileSaved: 'Profile saved! The chatbot will greet you personally.',
      testVoice: 'Test Voice',
      testingVoice: 'Testing voice...',
      identityTitle: 'Identity & Profile (Used by Chatbot)',
      identityDesc: 'MajorI.A will address you personally',
      preview: 'Preview',
      previewPrompt: 'Enter your first name to personalize your greeting',
      saveProfile: 'Save Profile',
      voiceTitle: 'Synthetic Voice Customization',
      voiceDesc: 'Live text-to-speech synthesis',
      voiceFemale: 'Female Voice',
      voiceFemaleDesc: 'Warm, soft, and fluent tone',
      voiceMale: 'Male Voice',
      voiceMaleDesc: 'Calm, clear, and confident tone',
      voiceListening: 'Playing sample...',
      voiceListen: 'Listen to voice sample',
      alertTitle: 'Notification System & Alert Sounds',
      alertDesc: 'Reminders & Events',
      testSound: 'Click to test sound',
      energyTitle: 'Consumption & Guaranteed Monthly Rollover',
      energyLevel: 'AI Battery Level',
      energyAvailable: 'available',
      rolloverTitle: 'Guaranteed automatic rollover',
      rolloverCarried: 'carried over from last month',
      rolloverDesc: 'All unused energy at the end of each billing cycle is automatically preserved and carried over to the next month.',
      totalEnergyAvailable: 'Total combined available',
      simulateRollover: 'Simulate monthly rollover',
      quickRecharge: 'Quick Recharge',
      mobileBridgeTitle: 'Mobile Bridge & Phone Companion',
      mobileBridgeDesc: 'Pair your iPhone or Android for mobile notifications',
      open: 'Open',
      customImage: 'Custom Image',
      reset: 'Reset',
      resetZone: 'Reset Zone',
      clearAllData: 'Clear All Data',
    },
    pricing: {
      modalTitle: 'Plans & AI Energy Consumption',
      modalDesc: 'Upgrade your subscription or manage Stripe billing options',
      title: 'Plans & Subscriptions',
      subtitle: 'Guaranteed automatic monthly rollover of unused energy',
      free: 'Free',
      pro: 'Professional',
      ultra: 'Ultra Cyber',
      energyGauge: 'AI Energy Gauge',
      rollover: 'Guaranteed Monthly Rollover',
      currentPlan: 'Your Current Plan',
      choosePlan: 'Choose this plan',
      upgrade: 'Upgrade now',
    },
    plans: {
      title: 'Plans & Energy Capacity',
      subtitle: 'Get more compute power and enjoy automatic monthly rollover of unused energy.',
      popular: 'Recommended',
      starter: 'Starter',
      pro: 'Professional',
      ultimate: 'Ultimate Cyber',
      perMonth: '/ month',
      choosePlan: 'Select this plan',
      subscribe: 'Subscribe now',
      rolloverNotice: '⚡ Energy rollover included: Unused energy carries over to next month!',
      activePlan: 'Active Plan',
      energyCapacity: 'Monthly energy capacity',
      reportMonthly: 'Automatic rollover on the 1st of every month',
    },
    auth: {
      title: 'Authentication & Account',
      subtitle: 'Sync your data across all your devices securely.',
      loginTitle: 'Sign In',
      signupTitle: 'Create Account',
      email: 'Email Address',
      password: 'Password',
      confirmPassword: 'Confirm Password',
      signIn: 'Sign In',
      signUp: 'Sign Up',
      logout: 'Log Out',
      forgotPassword: 'Forgot password?',
      loggedInAs: 'Logged in as',
      guest: 'Guest Mode (Local data only)',
      connectSuccess: 'Successfully connected! Data synchronized.',
      logoutSuccess: 'You have been logged out.',
    },
    mobileBridge: {
      title: 'Mobile Bridge & Phone Companion',
      subtitle: 'Pair your smartphone by scanning the QR code or entering the secure PIN.',
      pairingCode: 'Secure Pairing PIN',
      scanQr: 'Scan QR code with your phone',
      connectedDevices: 'Connected Devices',
      syncNow: 'Sync Now',
      disconnect: 'Disconnect Device',
      pairingSuccess: 'Phone connected successfully!',
    },
    errors: {
      generic: 'An unexpected error occurred. Please try again.',
      networkError: 'Network connection unstable or unavailable.',
      serverError: 'Remote server returned an error.',
      unauthorized: 'Unauthorized access. Please log in again.',
      forbidden: 'Action forbidden.',
      quotaExceeded: 'Monthly energy limit reached. Please upgrade your plan.',
      fileTooLarge: 'File exceeds maximum size limit (10MB).',
      invalidFile: 'Unsupported file format.',
      transcriptionFailed: 'Audio transcription failed. Check microphone or audio format.',
      aiError: 'Error generating AI response.',
      emptyInput: 'Please enter a message before sending.',
      notFound: 'Item not found.',
    },
    toasts: {
      saved: 'Changes saved successfully!',
      deleted: 'Item deleted.',
      updated: 'Update completed.',
      copied: 'Copied to clipboard!',
      error: 'An error occurred.',
      success: 'Operation successful!',
      warning: 'Warning:',
      info: 'Information:',
      reminderAlert: '🔔 Reminder alert!',
      voiceEnabled: 'Voice auto-reading enabled.',
      voiceDisabled: 'Voice auto-reading disabled.',
      confidentialEnabled: 'Confidential mode enabled.',
      confidentialDisabled: 'Confidential mode disabled.',
      languageChanged: 'Language changed: English.',
    },
  },
};
