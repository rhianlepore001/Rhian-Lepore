import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, Trash2, Plus, Loader2, Image as ImageIcon, ExternalLink } from 'lucide-react';

interface GalleryItem {
    id: string;
    image_url: string;
    title: string | null;
    display_order: number;
}

interface BusinessGalleryManagerProps {
    accentColor: string;
}

export const BusinessGalleryManager: React.FC<BusinessGalleryManagerProps> = ({ accentColor }) => {
    const { user } = useAuth();
    const [gallery, setGallery] = useState<GalleryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) fetchGallery();
    }, [user]);

    const fetchGallery = async () => {
        try {
            const { data, error } = await supabase
                .from('business_galleries')
                .select('*')
                .eq('user_id', user?.id)
                .order('display_order');

            if (error) throw error;
            setGallery(data || []);
        } catch (error) {
            console.error('Error fetching gallery:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        if (file.size > 5 * 1024 * 1024) {
            alert('A imagem deve ter no máximo 5MB.');
            return;
        }

        setUploading(true);
        try {
            // 1. Upload to storage
            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('galleries')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Get public URL
            const { data } = supabase.storage.from('galleries').getPublicUrl(fileName);
            const imageUrl = data.publicUrl;

            // 3. Insert into database
            const { error: dbError } = await supabase
                .from('business_galleries')
                .insert({
                    user_id: user.id,
                    image_url: imageUrl,
                    display_order: gallery.length
                });

            if (dbError) throw dbError;

            fetchGallery();
        } catch (error) {
            console.error('Error uploading to gallery:', error);
            alert('Erro ao fazer upload da imagem.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string, imageUrl: string) => {
        if (!window.confirm('Tem certeza que deseja remover esta foto?')) return;

        try {
            // 1. Delete from DB
            const { error: dbError } = await supabase
                .from('business_galleries')
                .delete()
                .eq('id', id);

            if (dbError) throw dbError;

            // 2. Try to delete from storage (extract path from URL)
            const path = imageUrl.split('galleries/')[1];
            if (path) {
                await supabase.storage.from('galleries').remove([path]);
            }

            setGallery(gallery.filter(item => item.id !== id));
        } catch (error) {
            console.error('Error deleting image:', error);
        }
    };

    if (loading) return null;

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 md:p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-white font-bold text-base md:text-lg mb-1">
                        Galeria do Portfólio
                    </h3>
                    <p className="text-xs text-neutral-500">
                        Mostre seus melhores trabalhos para atrair mais clientes
                    </p>
                </div>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className={`flex items-center gap-2 px-4 py-2 bg-${accentColor} text-black font-bold rounded-lg hover:scale-105 transition-all text-xs active:scale-95 disabled:opacity-50`}
                >
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Adicionar Foto
                </button>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleUpload}
            />

            {gallery.length === 0 ? (
                <div className="border-2 border-dashed border-neutral-800 rounded-xl p-8 text-center bg-black/20">
                    <ImageIcon className="w-10 h-10 text-neutral-700 mx-auto mb-3" />
                    <p className="text-neutral-500 text-sm">Sua galeria está vazia.</p>
                    <p className="text-neutral-600 text-xs mt-1">Adicione fotos dos seus cortes, barbas ou ambiente.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {gallery.map((item) => (
                        <div key={item.id} className="relative group aspect-square rounded-lg overflow-hidden border border-neutral-800 bg-neutral-800">
                            <img src={item.image_url} alt="Gallery" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={() => handleDelete(item.id, item.image_url)}
                                    className="p-2 bg-red-500/80 rounded-full text-white hover:bg-red-600 transition-colors"
                                    title="Excluir"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <a
                                    href={item.image_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-2 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors"
                                    title="Ver imagem completa"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
