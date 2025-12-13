import React, { useState } from 'react';
import Head from 'next/head';
import Header from '../components/Header';
import Footer from '../components/Footer';

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

      <div className="blog-page">
        <Header
          email="Info@solaira.tn"
          phone="(+216) 99-999-999"
          logoImage="flag_of_Tunisia.svg"
          logoAlt="Solaira Logo"
          navItems={['Home Battery', 'Solar Panels', 'About Us', 'Blog', 'Contact']}
          contactButtonText="Contact"
        />

        {/* Hero Section */}
        <section className="blog-hero">
          <div className="blog-hero-content">
            <h1 className="blog-title">
              Solaira <span className="highlight">Blog</span>
            </h1>
            <p className="blog-subtitle">
              Insights, tips, and news about smart energy solutions and sustainable living
            </p>

            {/* Search Bar */}
            <div className="search-container">
              <input
                type="text"
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section className="category-filter-section">
          <div className="category-filter">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`category-btn ${selectedCategory === category.id ? 'active' : ''}`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </section>

        {/* Featured Article */}
        {featuredArticle && selectedCategory === 'all' && !searchQuery && (
          <section className="featured-section">
            <div className="featured-article">
              <div className="featured-image-container">
                <img
                  src={featuredArticle.image}
                  alt={featuredArticle.title}
                  className="featured-image"
                />
              </div>
              <div className="featured-content">
                <div className="featured-badge">Featured Article</div>
                <h2 className="featured-title">{featuredArticle.title}</h2>
                <p className="featured-excerpt">{featuredArticle.excerpt}</p>
                <div className="featured-meta">
                  <span>{featuredArticle.author}</span>
                  <span>•</span>
                  <span>{featuredArticle.date}</span>
                  <span>•</span>
                  <span>{featuredArticle.readTime}</span>
                </div>
                <button className="read-article-btn">Read Article →</button>
              </div>
            </div>
          </section>
        )}

        {/* Articles Grid */}
        <section className="articles-section">
          {regularArticles.length > 0 ? (
            <div className="articles-grid">
              {regularArticles.map((article) => (
                <div key={article.id} className="article-card">
                  <div className="article-image-container">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="article-image"
                    />
                    <div className="article-category-badge">
                      {categories.find(c => c.id === article.category)?.label}
                    </div>
                  </div>
                  
                  <div className="article-content">
                    <h3 className="article-title">{article.title}</h3>
                    <p className="article-excerpt">{article.excerpt}</p>
                    
                    <div className="article-meta">
                      <span>{article.author}</span>
                      <span>•</span>
                      <span>{article.readTime}</span>
                    </div>

                    <div className="article-footer">
                      <span className="article-date">{article.date}</span>
                      <button className="read-more-btn">Read More →</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-results">
              <h3 className="no-results-title">No articles found</h3>
              <p className="no-results-text">Try adjusting your search or filter criteria</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="clear-filters-btn"
              >
                Clear Filters
              </button>
            </div>
          )}
        </section>

        {/* Newsletter Subscription */}
        <section className="newsletter-section">
          <div className="newsletter-content">
            <h2 className="newsletter-title">Stay Updated</h2>
            <p className="newsletter-text">
              Get the latest energy tips, technology insights, and company news delivered to your inbox
            </p>
            <div className="newsletter-form">
              <input
                type="email"
                placeholder="Enter your email"
                className="newsletter-input"
              />
              <button className="newsletter-button">Subscribe</button>
            </div>
            <p className="newsletter-disclaimer">
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

      <style jsx>{`
        .blog-page {
          width: 100%;
          min-height: 100vh;
          background: linear-gradient(to bottom, #f9fafb, #ffffff);
        }

        .blog-hero {
          padding: 160px 20px 60px;
          text-align: center;
        }

        .blog-hero-content {
          max-width: 1200px;
          margin: 0 auto;
        }

        .blog-title {
          font-size: 56px;
          font-weight: 300;
          margin-bottom: 24px;
          color: #141414;
        }

        .highlight {
          color: #00ad62;
          font-weight: 400;
        }

        .blog-subtitle {
          font-size: 20px;
          color: #6b7280;
          max-width: 800px;
          margin: 0 auto 40px;
        }

        .search-container {
          max-width: 600px;
          margin: 0 auto;
          position: relative;
        }

        .search-input {
          width: 100%;
          padding: 16px 20px 16px 48px;
          border: 1px solid #d1d5db;
          border-radius: 50px;
          font-size: 16px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }

        .search-input:focus {
          outline: none;
          border-color: #00ad62;
          box-shadow: 0 4px 16px rgba(0, 173, 98, 0.2);
        }

        .search-input::before {
          content: '🔍';
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
        }

        .category-filter-section {
          padding: 0 20px 48px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .category-filter {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
        }

        .category-btn {
          padding: 12px 24px;
          border-radius: 50px;
          border: none;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          background: white;
          color: #6b7280;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }

        .category-btn:hover {
          background: #f3f4f6;
        }

        .category-btn.active {
          background: #00ad62;
          color: white;
          box-shadow: 0 4px 8px rgba(0, 173, 98, 0.3);
        }

        .featured-section {
          padding: 0 20px 60px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .featured-article {
          background: white;
          border-radius: 24px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
          overflow: hidden;
          display: grid;
          grid-template-columns: 1fr 1fr;
        }

        .featured-image-container {
          height: 100%;
          min-height: 400px;
        }

        .featured-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .featured-content {
          padding: 48px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .featured-badge {
          display: inline-flex;
          align-items: center;
          background: #d1fae5;
          color: #065f46;
          padding: 8px 16px;
          border-radius: 50px;
          font-size: 12px;
          font-weight: 600;
          width: fit-content;
          margin-bottom: 16px;
        }

        .featured-title {
          font-size: 32px;
          font-weight: bold;
          color: #141414;
          margin-bottom: 16px;
          line-height: 1.3;
        }

        .featured-excerpt {
          font-size: 18px;
          color: #6b7280;
          margin-bottom: 24px;
          line-height: 1.6;
        }

        .featured-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color: #9ca3af;
          margin-bottom: 24px;
        }

        .read-article-btn {
          background: #00ad62;
          color: white;
          padding: 14px 32px;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          width: fit-content;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 173, 98, 0.3);
        }

        .read-article-btn:hover {
          background: #01a659;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 173, 98, 0.4);
        }

        .articles-section {
          padding: 0 20px 80px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .articles-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 32px;
        }

        .article-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .article-card:hover {
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
          transform: translateY(-8px);
        }

        .article-image-container {
          position: relative;
          height: 200px;
          overflow: hidden;
        }

        .article-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease;
        }

        .article-card:hover .article-image {
          transform: scale(1.1);
        }

        .article-category-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(10px);
          padding: 6px 12px;
          border-radius: 50px;
          font-size: 11px;
          font-weight: 600;
          color: #374151;
        }

        .article-content {
          padding: 24px;
        }

        .article-title {
          font-size: 20px;
          font-weight: bold;
          color: #141414;
          margin-bottom: 12px;
          line-height: 1.4;
          transition: color 0.2s ease;
        }

        .article-card:hover .article-title {
          color: #00ad62;
        }

        .article-excerpt {
          font-size: 14px;
          color: #6b7280;
          margin-bottom: 16px;
          line-height: 1.6;
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .article-meta {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #f3f4f6;
        }

        .article-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .article-date {
          font-size: 13px;
          color: #9ca3af;
        }

        .read-more-btn {
          color: #00ad62;
          font-weight: 500;
          font-size: 14px;
          border: none;
          background: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .read-more-btn:hover {
          color: #01a659;
        }

        .no-results {
          text-align: center;
          padding: 80px 20px;
        }

        .no-results-title {
          font-size: 24px;
          font-weight: 600;
          color: #141414;
          margin-bottom: 12px;
        }

        .no-results-text {
          color: #6b7280;
          margin-bottom: 24px;
        }

        .clear-filters-btn {
          background: #00ad62;
          color: white;
          padding: 12px 24px;
          border: none;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .clear-filters-btn:hover {
          background: #01a659;
        }

        .newsletter-section {
          padding: 80px 20px;
          background: linear-gradient(to right, #00ad62, #01a659);
          text-align: center;
          color: white;
        }

        .newsletter-content {
          max-width: 700px;
          margin: 0 auto;
        }

        .newsletter-title {
          font-size: 36px;
          font-weight: 300;
          margin-bottom: 16px;
        }

        .newsletter-text {
          font-size: 18px;
          color: rgba(255, 255, 255, 0.9);
          margin-bottom: 32px;
        }

        .newsletter-form {
          display: flex;
          gap: 12px;
          max-width: 500px;
          margin: 0 auto 16px;
        }

        .newsletter-input {
          flex: 1;
          padding: 14px 20px;
          border-radius: 12px;
          border: none;
          font-size: 16px;
        }

        .newsletter-input:focus {
          outline: none;
        }

        .newsletter-button {
          padding: 14px 32px;
          background: white;
          color: #00ad62;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .newsletter-button:hover {
          background: #f9fafb;
          transform: scale(1.05);
        }

        .newsletter-disclaimer {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
        }

        @media (max-width: 1024px) {
          .featured-article {
            grid-template-columns: 1fr;
          }

          .featured-image-container {
            min-height: 300px;
          }
        }

        @media (max-width: 768px) {
          .blog-title {
            font-size: 36px;
          }

          .articles-grid {
            grid-template-columns: 1fr;
          }

          .newsletter-form {
            flex-direction: column;
          }

          .category-filter {
            justify-content: flex-start;
          }
        }
      `}</style>
    </>
  );
};

export default BlogPage;