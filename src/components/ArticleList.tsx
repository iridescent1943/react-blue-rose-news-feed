import type { Article } from '../types';
import { ArticleCard } from './ArticleCard';

interface Props {
  articles: Article[];
  loading: boolean;
  activeCount: number;
  onSelect: (articleKey: string) => void;
  selectedKey: string | null;
  onSelectTemplate: (article: Article) => void;
}

function getArticleKey(article: { feedId: string; link: string; pubDate: string }): string {
  return `${article.feedId}::${article.link}::${article.pubDate}`;
}

const TEMPLATE_ARTICLES = [
  {
    source: 'Blue Rose Journal',
    title: 'Why Blue Roses Became a Symbol of Elegant Rarity',
    description: 'A short guide to the symbolism, history, and modern cultural meaning of blue roses.',
  },
  {
    source: 'Vintage Floral Weekly',
    title: 'Collecting Antique Blue Rose Prints: 5 Starter Tips',
    description: 'From Art Nouveau postcards to porcelain motifs, learn how to curate a timeless collection.',
  },
  {
    source: 'Garden Aesthetic Daily',
    title: 'Designing a Blue-Rose Inspired Reading Corner at Home',
    description: 'Color palette pairings, fabrics, and lighting ideas for an elegant vintage mood.',
  },
  {
    source: 'Alerts Preview',
    title: 'How to Track Blue Rose Mentions Using Google Alerts RSS',
    description: 'Set up targeted alerts and keep your feed focused on relevant blue-rose stories.',
  },
  {
    source: 'Blue Conservatory Notes',
    title: 'The Lost Symbolism of Azure Flowers in 19th Century Diaries',
    description: 'A historical note on romantic symbolism, floral codes, and private writing traditions.',
  },
  {
    source: 'Porcelain & Petals',
    title: 'Blue Rose Teacups: Recognizing Authentic Vintage Patterns',
    description: 'How to identify hallmark engravings, glaze tones, and restoration signs when collecting.',
  },
  {
    source: 'Moonlit Greenhouse',
    title: 'Creating a Twilight Blue Floral Moodboard for Weddings',
    description: 'Palette combinations, materials, and flower pairings for an elegant dreamlike ceremony.',
  },
  {
    source: 'Rosehouse Archive',
    title: 'A Short Timeline of Blue Rose in Literature and Film',
    description: 'From surreal poetry to modern cinema, where the blue rose motif keeps appearing.',
  },
  {
    source: 'Floral Collector Weekly',
    title: '7 Places to Find Rare Blue Rose Ephemera Online',
    description: 'Auction keywords, vintage marketplaces, and caution tips for first-time collectors.',
  },
  {
    source: 'Classic Bloom Review',
    title: 'Pressed Flower Frames with Indigo and Silver Tones',
    description: 'A quick guide to preserving petals and styling them in vintage-inspired home decor.',
  },
  {
    source: 'Blue Hour Dispatch',
    title: 'How Boutique Cafes Use Blue Roses in Seasonal Branding',
    description: 'Real examples of menu design, storefront styling, and social visuals with floral motifs.',
  },
  {
    source: 'Garden Aesthetic Daily',
    title: 'Muted Navy, Powder Blue, and Cream: A Soft Retro Palette',
    description: 'Color recipe ideas for stationery, posters, and room styling centered on blue roses.',
  },
  {
    source: 'Symbolic Botany',
    title: 'What Makes the Blue Rose Feel "Unreachable" in Design?',
    description: 'A design psychology perspective on rarity cues, contrast, and emotional framing.',
  },
  {
    source: 'Alerts Preview',
    title: 'Best Google Alert Queries for Blue Rose Research',
    description: 'Query operators and source filters to reduce noise and track quality references.',
  },
  {
    source: 'The Velvet Florist',
    title: 'Styling Vintage Book Covers with Blue Rose Foil Motifs',
    description: 'Typography pairings and metallic accents for a timeless editorial look.',
  },
  {
    source: 'Nocturne Home Journal',
    title: 'Dreamy Reading Nooks Inspired by Blue Rose Aesthetics',
    description: 'Lighting, texture layers, and antique furniture ideas for a romantic night tone.',
  },
  {
    source: 'Rosehouse Archive',
    title: 'Botanical Illustration Techniques for Soft Blue Petals',
    description: 'Ink-and-wash methods to achieve translucent gradients and vintage paper feel.',
  },
  {
    source: 'Porcelain & Petals',
    title: 'Antique Brooches and Blue Rose Enamel Work',
    description: 'A collector checklist for clasp condition, enamel cracks, and maker marks.',
  },
  {
    source: 'Blue Conservatory Notes',
    title: 'From Myth to Modernity: Why Blue Flowers Still Fascinate',
    description: 'An essay on rarity, imagination, and the long cultural life of impossible blooms.',
  },
  {
    source: 'Preview Scroll Test',
    title: 'Longform Preview Test: Blue Rose Symbolism Across Eras',
    description: 'This is a long-form preview test article used to validate independent scrolling in the Article Preview panel.\n\nIn medieval botanical writing, blue flowers were often treated as metaphorical rather than botanical facts. The language around them merged theology, myth, and desire. Over centuries, this transformed into a visual code that represented impossible longing.\n\nBy the Victorian era, floral dictionaries popularized emotional meanings, and the blue rose became a shorthand for rare affection, distant hope, and refined mystery. In decorative arts, this symbolism was paired with porcelain tones, silver linework, and moonlit scenes.\n\nModern design keeps reusing this code. In editorial layouts, blue rose motifs are often set against soft neutrals and washed paper textures. In fashion visuals, they appear with satin highlights and cool shadows to create an elegant, dreamlike atmosphere.\n\nFor testing purposes, this paragraph intentionally continues with additional descriptive content so the preview card must overflow vertically. A useful preview panel should remain readable without breaking the main list layout, and it should allow smooth mouse-wheel and trackpad scrolling while preserving selection state in the article list.\n\nIf this text appears too short, keep scrolling: we add more lines to ensure the content area clearly exceeds the available height. Layered gradients, muted cobalt accents, and lightly distressed textures can help bridge modern UI systems with nostalgic aesthetics. Thoughtful typography spacing also plays a major role.\n\nEnd of longform section one. Continue below for extra overflow validation.\n\nSection two: repeated narrative for scroll depth testing. The blue rose appears in private journals, film posters, perfume branding, and boutique cafe identity systems. Each context shifts meaning slightly, but rarity and elegance remain the dominant emotional anchors.\n\nSection three: final extension to guarantee scroll. This sentence and the following lines are intentionally verbose so that the preview panel can be tested for long-content behavior in realistic UI usage scenarios. The panel should scroll independently and stay visually stable while users compare multiple selected articles.',
  },
  {
    source: 'Preview Scroll Test',
    title: 'Longform Preview Test: Collector Notes on Vintage Blue Rose Objects',
    description: 'Archive entry for UI scrolling test.\n\nWhen evaluating antique objects with floral motifs, collectors check glazing consistency, edge wear, hallmark stamps, and restoration traces. Blue pigments vary by period and region, and this can reveal production context.\n\nThis extended description exists to test the preview panel with dense text content. The user should be able to scroll the preview region independently from the article list region.\n\nAdditional notes: compare surface crackle depth, underglaze opacity, and motif line confidence. Beware overcleaned pieces that lose tonal nuance.\n\nFinal notes for overflow testing: include enough copy to exceed the preview viewport on most laptop screens and confirm that scrolling remains smooth under repeated article switching.',
  },
];

function TemplateArticles({ onSelectTemplate }: { onSelectTemplate: (article: Article) => void }) {
  return (
    <section className="template-wrap" aria-label="Template articles">
      <div className="template-header">
        <h3>Latest News</h3>
        <span>Preview content while feeds are empty</span>
      </div>
      <div className="template-list">
        {TEMPLATE_ARTICLES.slice(0, 5).map((item) => {
          const templateArticle: Article = {
            title: item.title,
            link: '',
            pubDate: '',
            description: item.description,
            feedId: 'template',
            feedName: item.source,
            feedColor: '#5a8fd1',
          };

          return (
          <article
            key={item.title}
            className="template-card"
            onClick={() => onSelectTemplate(templateArticle)}
          >
            <div className="template-body">
              <span className="template-meta">{item.source}</span>
              <h4 className="template-title">{item.title}</h4>
              <p className="template-desc">{item.description}</p>
            </div>
          </article>
          );
        })}
      </div>
    </section>
  );
}

export function ArticleList({ articles, loading, activeCount, onSelect, selectedKey, onSelectTemplate }: Props) {
  if (activeCount === 0) {
    return (
      <TemplateArticles onSelectTemplate={onSelectTemplate} />
    );
  }

  if (loading) {
    return (
      <div className="loading-state">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton-card">
            <div className="skeleton-line wide" />
            <div className="skeleton-line" />
            <div className="skeleton-line short" />
          </div>
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <TemplateArticles onSelectTemplate={onSelectTemplate} />
    );
  }

  return (
    <div className="article-list">
      {articles.map((article) => {
        const articleKey = getArticleKey(article);
        return (
        <ArticleCard
          key={articleKey}
          article={article}
          onSelect={() => onSelect(articleKey)}
          selected={selectedKey === articleKey}
        />
        );
      })}
    </div>
  );
}
