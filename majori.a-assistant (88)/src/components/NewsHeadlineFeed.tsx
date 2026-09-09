import React, { useState, useEffect, useRef } from 'react';
import { 
  Newspaper, 
  ExternalLink, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  Radio, 
  Sparkles,
  Flame,
  AlertCircle
} from 'lucide-react';
import { playCyberSound } from '../utils/security';

export interface NewsItem {
  id: string;
  title: string;
  link: string;
  source: string;
  sourceColor: string;
  sourceBadgeBg: string;
  image?: string;
  pubDate?: string;
  timeAgo?: string;
}

interface NewsHeadlineFeedProps {
  onSelectPrompt?: (prompt: string) => void;
}

const RSS_SOURCES = [
  {
    name: 'France Info',
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.francetvinfo.fr/titres.rss',
    fallbackUrl: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.francetvinfo.fr/titres.rss',
    color: 'text-amber-500 dark:text-amber-400',
    badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30',
    dotColor: 'bg-amber-500',
  },
  {
    name: '20 Minutes',
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.20minutes.fr/feeds/rss-une.xml',
    fallbackUrl: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.20minutes.fr/feeds/rss-une.xml',
    color: 'text-sky-500 dark:text-sky-400',
    badgeBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-300 border-sky-500/30',
    dotColor: 'bg-sky-500',
  },
  {
    name: 'BFMTV',
    url: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.bfmtv.com/rss/info/flux-rss/flux-rss-une/',
    fallbackUrl: 'https://api.rss2json.com/v1/api.json?rss_url=https://www.bfmtv.com/rss/news-24-7/',
    color: 'text-blue-600 dark:text-blue-400',
    badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30',
    dotColor: 'bg-blue-600',
  },
];

function formatTimeAgo(dateString?: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMin = Math.round((now.getTime() - date.getTime()) / (1000 * 60));
    if (diffMin < 1) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

function extractImage(item: any): string | undefined {
  if (item?.enclosure?.link && typeof item.enclosure.link === 'string') {
    return item.enclosure.link;
  }
  if (item?.thumbnail && typeof item.thumbnail === 'string' && item.thumbnail.startsWith('http')) {
    return item.thumbnail;
  }
  // Try regex in description or content
  const htmlContent = item?.description || item?.content || '';
  const match = htmlContent.match(/<img[^>]+src=["']([^"'>]+)["']/i);
  if (match && match[1] && match[1].startsWith('http')) {
    return match[1];
  }
  return undefined;
}

export const NewsHeadlineFeed: React.FC<NewsHeadlineFeedProps> = ({ onSelectPrompt }) => {
  const [articles, setArticles] = useState<NewsItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem('neo-cached-news');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('neo-cached-news');
        if (cached && JSON.parse(cached).length > 0) return false;
      } catch {}
    }
    return true;
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const fetchNews = async (showLoadingState = true) => {
    if (showLoadingState && articles.length === 0) setLoading(true);
    setIsRefreshing(true);
    setHasError(false);

    try {
      const results = await Promise.allSettled(
        RSS_SOURCES.map(async (source) => {
          let res = await fetch(source.url).catch(() => null);
          let data = res && res.ok ? await res.json().catch(() => null) : null;
          
          if (!data || data.status !== 'ok' || !data.items || data.items.length === 0) {
            if (source.fallbackUrl && source.fallbackUrl !== source.url) {
              res = await fetch(source.fallbackUrl).catch(() => null);
              data = res && res.ok ? await res.json().catch(() => null) : null;
            }
          }

          if (data && data.status === 'ok' && Array.isArray(data.items)) {
            return data.items.slice(0, 4).map((item: any, index: number) => {
              const cleanTitle = (item.title || '')
                .replace(/&quot;/g, '"')
                .replace(/&#039;/g, "'")
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .trim();

              return {
                id: `${source.name}-${index}-${item.guid || item.link || Math.random()}`,
                title: cleanTitle,
                link: item.link,
                source: source.name,
                sourceColor: source.color,
                sourceBadgeBg: source.badgeBg,
                image: extractImage(item),
                pubDate: item.pubDate,
                timeAgo: formatTimeAgo(item.pubDate),
              } as NewsItem;
            });
          }
          return [];
        })
      );

      const allItems: NewsItem[] = [];
      const arrays = results
        .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === 'fulfilled')
        .map((r) => r.value);

      // Interleave items from each source for variety (e.g. 1st France Info, 1st 20 Minutes, 1st BFMTV, etc.)
      const maxLen = Math.max(0, ...arrays.map((a) => a.length));
      for (let i = 0; i < maxLen; i++) {
        for (const arr of arrays) {
          if (arr[i]) {
            allItems.push(arr[i]);
          }
        }
      }

      // Limit to 5 top headline articles
      const topHeadlines = allItems.filter((item) => item.title && item.link).slice(0, 5);

      if (topHeadlines.length > 0) {
        setArticles(topHeadlines);
        try {
          localStorage.setItem('neo-cached-news', JSON.stringify(topHeadlines));
        } catch {}
        setHasError(false);
      } else if (articles.length === 0) {
        setHasError(true);
      }
    } catch (err) {
      console.warn('Erreur chargement flux RSS À la une:', err);
      if (articles.length === 0) {
        setHasError(true);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    playCyberSound('click');
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div 
      id="news-headline-feed"
      className="bg-[var(--fb-card-translucent)] backdrop-blur-xs rounded-2xl p-4 sm:p-5 border border-[var(--fb-card-border)] shadow-sm space-y-3.5"
    >
      {/* Feed Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-rose-500/10 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/20 shadow-xs">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[var(--fb-text-primary)] text-sm sm:text-base">À la une</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/25 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider">
                <Flame className="w-3 h-3 text-rose-500" />
                En direct
              </span>
            </div>
            <p className="text-[11px] text-[var(--fb-text-secondary)] font-medium">
              France Info • 20 Minutes • BFMTV
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            id="refresh-news-btn"
            onClick={() => {
              playCyberSound('click');
              fetchNews(false);
            }}
            disabled={isRefreshing}
            className="p-2 rounded-full bg-[var(--fb-surface)] hover:bg-[var(--fb-surface-hover)] text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)] transition-all border border-[var(--fb-border-light)] cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Actualiser les nouvelles"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[var(--fb-blue)]' : ''}`} />
          </button>

          <div className="hidden sm:flex items-center gap-1">
            <button
              type="button"
              id="scroll-news-left"
              onClick={() => handleScroll('left')}
              className="p-2 rounded-full bg-[var(--fb-surface)] hover:bg-[var(--fb-surface-hover)] text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)] transition-all border border-[var(--fb-border-light)] cursor-pointer shadow-2xs"
              title="Défiler vers la gauche"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              id="scroll-news-right"
              onClick={() => handleScroll('right')}
              className="p-2 rounded-full bg-[var(--fb-surface)] hover:bg-[var(--fb-surface-hover)] text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)] transition-all border border-[var(--fb-border-light)] cursor-pointer shadow-2xs"
              title="Défiler vers la droite"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="flex gap-3 overflow-x-hidden pb-1">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="min-w-[240px] sm:min-w-[270px] max-w-[280px] rounded-xl bg-[var(--fb-surface)]/60 border border-[var(--fb-border-light)] p-3 space-y-2.5 animate-pulse shrink-0"
            >
              <div className="w-full h-28 bg-[var(--fb-border-light)]/60 rounded-lg" />
              <div className="h-4 bg-[var(--fb-border-light)]/60 rounded w-1/3" />
              <div className="h-4 bg-[var(--fb-border-light)]/60 rounded w-full" />
              <div className="h-4 bg-[var(--fb-border-light)]/60 rounded w-4/5" />
            </div>
          ))}
        </div>
      ) : hasError || articles.length === 0 ? (
        <div className="p-4 rounded-xl bg-[var(--fb-surface)]/60 border border-[var(--fb-border-light)] text-center space-y-2">
          <div className="flex justify-center text-[var(--fb-text-secondary)]">
            <AlertCircle className="w-6 h-6 text-amber-500" />
          </div>
          <p className="text-xs text-[var(--fb-text-secondary)] font-medium">
            Impossible de charger le fil d'actualité en direct pour le moment.
          </p>
          <button
            type="button"
            onClick={() => fetchNews(true)}
            className="text-xs text-[var(--fb-blue)] hover:underline font-bold"
          >
            Réessayer
          </button>
        </div>
      ) : (
        /* Scrollable Cards Container */
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 pt-0.5 scrollbar-thin scrollbar-thumb-[var(--fb-border-light)] snap-x snap-mandatory focus:outline-none"
          tabIndex={0}
          aria-label="Articles à la une"
        >
          {articles.map((article, index) => (
            <div
              key={article.id}
              id={`news-card-${index}`}
              className="group relative min-w-[250px] sm:min-w-[280px] max-w-[290px] rounded-xl bg-[var(--fb-surface)]/70 hover:bg-[var(--fb-surface)]/95 border border-[var(--fb-border-light)] hover:border-[var(--fb-blue)]/50 transition-all duration-300 shadow-2xs hover:shadow-md flex flex-col justify-between shrink-0 snap-start overflow-hidden"
            >
              {/* Card Image Banner */}
              <div className="relative w-full h-32 bg-[var(--fb-surface-secondary)] overflow-hidden">
                {article.image ? (
                  <img
                    src={article.image}
                    alt={article.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[var(--fb-blue-light)]/40 to-[var(--fb-surface)] text-[var(--fb-blue)] p-4">
                    <Newspaper className="w-8 h-8 opacity-70 mb-1" />
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{article.source}</span>
                  </div>
                )}

                {/* Source Badge overlay */}
                <div className="absolute top-2 left-2 z-10">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-md shadow-xs ${article.sourceBadgeBg}`}>
                    {article.source}
                  </span>
                </div>

                {/* Time ago badge */}
                {article.timeAgo && (
                  <div className="absolute bottom-2 right-2 z-10">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-medium bg-black/60 text-white backdrop-blur-xs shadow-xs">
                      {article.timeAgo}
                    </span>
                  </div>
                )}
              </div>

              {/* Content Box */}
              <div className="p-3 sm:p-3.5 flex-1 flex flex-col justify-between gap-2.5">
                <h4 
                  className="font-bold text-xs sm:text-sm text-[var(--fb-text-primary)] group-hover:text-[var(--fb-blue)] transition-colors line-clamp-3 leading-snug"
                  title={article.title}
                >
                  {article.title}
                </h4>

                {/* Actions Footer */}
                <div className="pt-2 border-t border-[var(--fb-border-light)] flex items-center justify-between gap-2">
                  <a
                    href={article.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => playCyberSound('click')}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-[var(--fb-blue)] hover:underline"
                    title="Lire l'article complet sur le site"
                  >
                    <span>Lire l'article</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>

                  {onSelectPrompt && (
                    <button
                      type="button"
                      onClick={() => {
                        playCyberSound('beep');
                        onSelectPrompt(`Que penses-tu de cette actualité : "${article.title}" ? Peux-tu me résumer le contexte ?`);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--fb-surface)] hover:bg-[var(--fb-surface-hover)] border border-[var(--fb-border-light)] text-[10px] font-semibold text-[var(--fb-text-secondary)] hover:text-[var(--fb-text-primary)] transition-all cursor-pointer shadow-2xs"
                      title="Demander une analyse ou un résumé à Major2I.A"
                    >
                      <Sparkles className="w-2.5 h-2.5 text-[var(--fb-blue)]" />
                      <span>Analyser</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
