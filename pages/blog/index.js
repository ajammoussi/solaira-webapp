import React, { useState } from 'react';
import Head from 'next/head';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import styles from './styles.module.css';

const BlogPage = () => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = [
    { id: 'all', label: 'All Articles' },
    { id: 'energy-tips', label: 'Energy Tips' },
    { id: 'technology', label: 'Technology' },
    { id: 'sustainability', label: 'Sustainability' },
    { id: 'news', label: 'Company News' }
  ];

  const articles = [
    {
      id: 1,
      title: 'How AI is Revolutionizing Home Energy Management',
      excerpt: 'Discover how artificial intelligence is making smart homes smarter by optimizing energy consumption and reducing costs automatically.',
      author: 'Sarah Johnson',
      date: 'December 10, 2025',
      readTime: '5 min read',
      category: 'technology',
      image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=500&fit=crop',
      featured: true
    },
    {
      id: 2,
      title: '10 Ways to Maximize Your Solar Battery Efficiency',
      excerpt: 'Learn practical tips to get the most out of your home battery system and increase your energy savings.',
      author: 'Ahmed Ben Ali',
      date: 'December 8, 2025',
      readTime: '7 min read',
      category: 'energy-tips',
      image: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=800&h=500&fit=crop'
    },
    {
      id: 3,
      title: 'Tunisia\'s Path to Clean Energy: 2025 Update',
      excerpt: 'Exploring Tunisia\'s renewable energy goals and how homeowners are contributing to a sustainable future.',
      author: 'Leila Mansour',
      date: 'December 5, 2025',
      readTime: '6 min read',
      category: 'sustainability',
      image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=800&h=500&fit=crop'
    },
    {
      id: 4,
      title: 'Understanding Net Metering and Energy Independence',
      excerpt: 'A comprehensive guide to net metering policies in Tunisia and how they affect your energy bills.',
      author: 'Karim Trabelsi',
      date: 'December 3, 2025',
      readTime: '8 min read',
      category: 'energy-tips',
      image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=800&h=500&fit=crop'
    },
    {
      id: 5,
      title: 'Solaira Reaches 400+ Happy Customers Milestone',
      excerpt: 'Celebrating our growth and the impact we\'re making on Tunisian households\' energy independence.',
      author: 'Solaira Team',
      date: 'December 1, 2025',
      readTime: '4 min read',
      category: 'news',
      image: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&h=500&fit=crop'
    },
    {
      id: 6,
      title: 'The Science Behind Battery Storage Technology',
      excerpt: 'Deep dive into lithium-ion battery technology and why it\'s perfect for home energy storage.',
      author: 'Dr. Mohamed Khalil',
      date: 'November 28, 2025',
      readTime: '10 min read',
      category: 'technology',
      image: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=800&h=500&fit=crop'
    }
  ];

  const filteredArticles = articles.filter(article => {
    const matchesCategory = selectedCategory === 'all' || article.category === selectedCategory;
    const matchesSearch = article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         article.excerpt.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featuredArticle = articles.find(a => a.featured);
  const regularArticles = filteredArticles.filter(a => !a.featured);

  return (
    <>
      <Head>
        <title>Blog - Solaira</title>
        <meta name="description" content="Insights, tips, and news about smart energy solutions and sustainable living" />
      </Head>

      <div className={styles['blog-page']}>
        <Header
          email="Info@solaira.tn"
          phone="(+216) 99-999-999"
          logoImage="flag_of_Tunisia.svg"
          logoAlt="Solaira Logo"
          navItems={['Home Battery', 'Solar Panels', 'About Us', 'Blog', 'Contact']}
          contactButtonText="Contact"
        />

        {/* Hero Section */}
        <section className={styles['blog-hero']}>
          <div className={styles['blog-hero-content']}>
            <h1 className={styles['blog-title']}>
              Solaira <span className={styles['highlight']}>Blog</span>
            </h1>
            <p className={styles['blog-subtitle']}>
              Insights, tips, and news about smart energy solutions and sustainable living
            </p>

            {/* Search Bar */}
            <div className={styles['search-container']}>
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={styles['search-input']}
              />
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section className={styles['category-filter-section']}>
          <div className={styles['category-filter']}>
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`${styles['category-btn']} ${selectedCategory === category.id ? styles['active'] : ''}`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </section>

        {/* Featured Article */}
        {featuredArticle && selectedCategory === 'all' && !searchQuery && (
          <section className={styles['featured-section']}>
            <div className={styles['featured-article']}>
              <div className={styles['featured-image-container']}>
                <img
                  src={featuredArticle.image}
                  alt={featuredArticle.title}
                  className={styles['featured-image']}
                />
              </div>
              <div className={styles['featured-content']}>
                <div className={styles['featured-badge']}>Featured Article</div>
                <h2 className={styles['featured-title']}>{featuredArticle.title}</h2>
                <p className={styles['featured-excerpt']}>{featuredArticle.excerpt}</p>
                <div className={styles['featured-meta']}>
                  <span>{featuredArticle.author}</span>
                  <span>•</span>
                  <span>{featuredArticle.date}</span>
                  <span>•</span>
                  <span>{featuredArticle.readTime}</span>
                </div>
                <button className={styles['read-article-btn']}>Read Article →</button>
              </div>
            </div>
          </section>
        )}

        {/* Articles Grid */}
        <section className={styles['articles-section']}>
          {regularArticles.length > 0 ? (
            <div className={styles['articles-grid']}>
              {regularArticles.map((article) => (
                <div key={article.id} className={styles['article-card']}>
                  <div className={styles['article-image-container']}>
                    <img
                      src={article.image}
                      alt={article.title}
                      className={styles['article-image']}
                    />
                    <div className={styles['article-category-badge']}>
                      {categories.find(c => c.id === article.category)?.label}
                    </div>
                  </div>
                  
                  <div className={styles['article-content']}>
                    <h3 className={styles['article-title']}>{article.title}</h3>
                    <p className={styles['article-excerpt']}>{article.excerpt}</p>
                    
                    <div className={styles['article-meta']}>
                      <span>{article.author}</span>
                      <span>•</span>
                      <span>{article.readTime}</span>
                    </div>

                    <div className={styles['article-footer']}>
                      <span className={styles['article-date']}>{article.date}</span>
                      <button className={styles['read-more-btn']}>Read More →</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles['no-results']}>
              <h3 className={styles['no-results-title']}>No articles found</h3>
              <p className={styles['no-results-text']}>Try adjusting your search or filter criteria</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className={styles['clear-filters-btn']}
              >
                Clear Filters
              </button>
            </div>
          )}
        </section>

        {/* Newsletter Subscription */}
        <section className={styles['newsletter-section']}>
          <div className={styles['newsletter-content']}>
            <h2 className={styles['newsletter-title']}>Stay Updated</h2>
            <p className={styles['newsletter-text']}>
              Get the latest energy tips, technology insights, and company news delivered to your inbox
            </p>
            <div className={styles['newsletter-form']}>
              <input
                type="email"
                placeholder="Enter your email"
                className={styles['newsletter-input']}
              />
              <button className={styles['newsletter-button']}>Subscribe</button>
            </div>
            <p className={styles['newsletter-disclaimer']}>
              Join 1,000+ subscribers. Unsubscribe anytime.
            </p>
          </div>
        </section>

        <Footer
          logoImage="https://play.teleporthq.io/static/svg/default-img.svg"
          logoAlt="Solaira Logo"
          phone="(+216) 99-999-999"
          email="info@solaira.tn"
          address={
            <>
              <span>Centre Urbain Nord</span>
              <br />
              <span>676 CUN BP, Tunis 1080</span>
            </>
          }
          aboutLinks={['Solar Panels', 'Home Battery', 'About Us', 'Blog', 'Product']}
          supportLinks={['Contact', 'Privacy Policy', 'Terms of Service']}
          connectLinks={['LinkedIn', 'Instagram', 'Facebook']}
          copyrightText="2025 Solaira. All right reserved."
        />
      </div>
    </>
  );
};

export default BlogPage;
