"use strict";
/**
 * Domain Suggestion Engine
 * Provides intelligent domain name suggestions based on user input
 */
class DomainSuggestionEngine {
    constructor() {
        this.commonPrefixes = ['get', 'my', 'the', 'go', 'try', 'use', 'find', 'best'];
        this.commonSuffixes = ['app', 'hub', 'lab', 'pro', 'zone', 'spot', 'base', 'link'];
        this.synonyms = new Map([
            ['shop', ['store', 'market', 'buy', 'sell']],
            ['tech', ['digital', 'cyber', 'smart', 'ai']],
            ['fast', ['quick', 'rapid', 'speed', 'turbo']],
            ['best', ['top', 'prime', 'elite', 'pro']],
            ['new', ['fresh', 'modern', 'next', 'nova']],
            ['web', ['online', 'net', 'digital', 'cyber']]
        ]);
    }
    /**
     * Generate domain suggestions based on input
     */
    generateSuggestions(baseDomain, unavailableTlds = []) {
        const suggestions = [];
        const cleanDomain = this.cleanDomain(baseDomain);
        // Add variations
        suggestions.push(...this.generateVariations(cleanDomain));
        // Add synonyms
        suggestions.push(...this.generateSynonyms(cleanDomain));
        // Add prefix/suffix combinations
        suggestions.push(...this.generatePrefixSuffix(cleanDomain));
        // Sort by confidence and return top suggestions
        return suggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 10);
    }
    cleanDomain(domain) {
        return domain.toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 20); // Limit length
    }
    generateVariations(domain) {
        const variations = [];
        // Add numbers
        for (let i = 1; i <= 9; i++) {
            variations.push({
                domain: `${domain}${i}`,
                type: 'variation',
                confidence: 0.7
            });
        }
        // Add common variations
        if (domain.length > 3) {
            variations.push({
                domain: `${domain}s`,
                type: 'variation',
                confidence: 0.8
            });
        }
        return variations;
    }
    generateSynonyms(domain) {
        const suggestions = [];
        for (const [word, synonymList] of this.synonyms) {
            if (domain.includes(word)) {
                synonymList.forEach(synonym => {
                    suggestions.push({
                        domain: domain.replace(word, synonym),
                        type: 'synonym',
                        confidence: 0.9
                    });
                });
            }
        }
        return suggestions;
    }
    generatePrefixSuffix(domain) {
        const suggestions = [];
        // Add prefixes
        this.commonPrefixes.forEach(prefix => {
            if (!domain.startsWith(prefix)) {
                suggestions.push({
                    domain: `${prefix}${domain}`,
                    type: 'prefix',
                    confidence: 0.6
                });
            }
        });
        // Add suffixes
        this.commonSuffixes.forEach(suffix => {
            if (!domain.endsWith(suffix)) {
                suggestions.push({
                    domain: `${domain}${suffix}`,
                    type: 'suffix',
                    confidence: 0.6
                });
            }
        });
        return suggestions;
    }
}
// Export for use in main app
if (typeof window !== 'undefined') {
    window.DomainSuggestionEngine = DomainSuggestionEngine;
}
