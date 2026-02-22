import { supabase } from '../lib/supabase';
import { generateEmbedding } from '../lib/gemini';

export interface SemanticMemory {
    id: string;
    client_id: string;
    observation: string;
    context_type: 'style' | 'preference' | 'habit';
    created_at: string;
    similarity?: number;
}

/**
 * Hook to manage client semantic memory using vector search (RAG)
 */
export function useSemanticMemory() {
    /**
     * Save a new observation with its embedding
     */
    async function saveMemory(
        clientId: string,
        observation: string,
        contextType: 'style' | 'preference' | 'habit' = 'preference'
    ) {
        try {
            // 1. Generate embedding using Gemini
            const embedding = await generateEmbedding(observation);

            // 2. Save to Supabase
            const { error } = await supabase
                .from('client_semantic_memory')
                .insert({
                    client_id: clientId,
                    observation,
                    embedding,
                    context_type: contextType
                });

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error saving semantic memory:', error);
            return { success: false, error };
        }
    }

    /**
     * Find relevant memories for a client based on a query
     */
    async function searchMemories(
        clientId: string,
        query: string,
        limit: number = 5,
        threshold: number = 0.5
    ): Promise<SemanticMemory[]> {
        try {
            // 1. Generate embedding for the query
            const queryEmbedding = await generateEmbedding(query);

            // 2. Search using RPC
            const { data, error } = await supabase.rpc('match_client_memories', {
                p_client_id: clientId,
                query_embedding: queryEmbedding,
                match_threshold: threshold,
                match_count: limit
            });

            if (error) throw error;
            return data as SemanticMemory[];
        } catch (error) {
            console.error('Error searching semantic memory:', error);
            return [];
        }
    }

    return {
        saveMemory,
        searchMemories
    };
}
