import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface Category {
    id: string;
    name: string;
}

interface Service {
    id: string;
    name: string;
    description: string;
    price: number;
    duration_minutes: number;
    category_id: string;
    image_url: string | null;
    active: boolean;
}

interface ServiceModalProps {
    service?: Service;
    categories: Category[];
    allServices: Service[]; // For upsell selection
    onClose: () => void;
    onSave: () => void;
    accentColor: string;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
    service,
    categories,
    allServices,
    onClose,
    onSave,
    accentColor
}) => {
    const { user, region } = useAuth();
    const [name, setName] = useState(service?.name || '');
    const [description, setDescription] = useState(service?.description || '');
    const [price, setPrice] = useState(service?.price?.toString() || '');
    const [duration, setDuration] = useState(service?.duration_minutes?.toString() || '30');
    const [categoryId, setCategoryId] = useState(service?.category_id || categories[0]?.id || '');
    const [active, setActive] = useState(service?.active ?? true);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(service?.image_url || null);

    const [selectedUpsells, setSelectedUpsells] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const currencySymbol = region === 'BR' ? 'R$' : '€';

    useEffect(() => {
        if (service?.id) {
            fetchUpsells();
        }
    }, [service]);

    const fetchUpsells = async () => {
        if (!service) return;
        const { data } = await supabase
            .from('service_upsells')
            .select('upsell_service_id')
            .eq('parent_service_id', service.id);

        if (data) {
            setSelectedUpsells(data.map(u => u.upsell_service_id));
        }
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];

            if (file.size > 10 * 1024 * 1024) { // 10MB limit
                alert('A imagem deve ter no máximo 10MB.');
                return;
            }

            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setLoading(true);

        try {
            let imageUrl = service?.image_url;

            if (imageFile) {
                const fileExt = imageFile.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('service_images')
                    .upload(fileName, imageFile);

                if (uploadError) throw uploadError;

                const { data } = supabase.storage.from('service_images').getPublicUrl(fileName);
                imageUrl = data.publicUrl;
            }

            const serviceData = {
                user_id: user.id,
                name,
                description,
                price: parseFloat(price),
                duration_minutes: parseInt(duration),
                category_id: categoryId,
                active,
                image_url: imageUrl
            };

            let serviceId = service?.id;

            if (serviceId) {
                await supabase.from('services').update(serviceData).eq('id', serviceId);
            } else {
                const { data, error } = await supabase.from('services').insert(serviceData).select().single();
                if (error) throw error;
                serviceId = data.id;
            }

            // Handle Upsells
            if (serviceId) {
                // First delete existing
                if (service?.id) {
                    await supabase.from('service_upsells').delete().eq('parent_service_id', serviceId);
                }

                // Insert new
                if (selectedUpsells.length > 0) {
                    const upsellData = selectedUpsells.map(upsellId => ({
                        parent_service_id: serviceId,
                        upsell_service_id: upsellId
                    }));
                    await supabase.from('service_upsells').insert(upsellData);
                }
            }

            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving service:', error);
            alert(`Erro ao salvar serviço: ${error.message || JSON.stringify(error)}`);
        } finally {
            setLoading(false);
        }
    };

    const toggleUpsell = (id: string) => {
        setSelectedUpsells(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="flex items-center justify-between p-4 border-b border-neutral-800 sticky top-0 bg-neutral-900 z-10">
                    <h3 className="text-white font-bold text-lg">
                        {service ? 'Editar Serviço' : 'Novo Serviço'}
                    </h3>
                    <button onClick={onClose} className="text-neutral-400 hover:text-white">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column: Image & Basic Info */}
                        <div className="space-y-4">
                            <div
                                className={`relative w-full h-48 rounded-lg bg-neutral-800 border-2 border-dashed ${imagePreview ? 'border-transparent' : 'border-neutral-700'} flex items-center justify-center cursor-pointer hover:border-${accentColor} overflow-hidden group transition-colors`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="flex flex-col items-center text-neutral-500">
                                        <ImageIcon className="w-8 h-8 mb-2" />
                                        <span className="text-xs">Adicionar Foto</span>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                    <Upload className="w-6 h-6 text-white" />
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleImageChange}
                            />

                            <div>
                                <label className="text-white font-mono text-xs mb-1 block">Nome do Serviço</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                                    placeholder={accentColor === 'beauty-neon' ? "Ex: Manicure e Pedicure" : "Ex: Corte Degradê"}
                                />
                            </div>

                            <div>
                                <label className="text-white font-mono text-xs mb-1 block">Categoria</label>
                                <select
                                    value={categoryId}
                                    onChange={e => setCategoryId(e.target.value)}
                                    className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                                >
                                    <option value="" disabled>Selecione uma categoria</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Right Column: Details & Upsells */}
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-white font-mono text-xs mb-1 block">Preço ({currencySymbol})</label>
                                    <input
                                        type="number"
                                        required
                                        step="0.01"
                                        value={price}
                                        onChange={e => setPrice(e.target.value)}
                                        className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-white font-mono text-xs mb-1 block">Duração (min)</label>
                                    <select
                                        value={duration}
                                        onChange={e => setDuration(e.target.value)}
                                        className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                                    >
                                        {[15, 30, 45, 60, 90, 120].map(m => (
                                            <option key={m} value={m}>{m} min</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-white font-mono text-xs mb-1 block">Descrição</label>
                                <textarea
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    rows={3}
                                    className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor} resize-none`}
                                    placeholder="Detalhes do serviço..."
                                />
                            </div>

                            <div className="border-t border-neutral-800 pt-4">
                                <label className="text-white font-bold text-sm mb-2 block flex items-center gap-2">
                                    🚀 Upsells (Sugestões)
                                    <span className="text-xs font-normal text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">Aumente seu ticket médio</span>
                                </label>
                                <p className="text-xs text-neutral-500 mb-3">
                                    Selecione serviços para sugerir quando o cliente escolher este.
                                </p>
                                <div className="max-h-32 overflow-y-auto space-y-2 bg-neutral-800/50 p-2 rounded-lg border border-neutral-800">
                                    {allServices.filter(s => s.id !== service?.id).map(s => (
                                        <div
                                            key={s.id}
                                            onClick={() => toggleUpsell(s.id)}
                                            className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${selectedUpsells.includes(s.id) ? `bg-${accentColor}/20 text-white` : 'hover:bg-neutral-700 text-neutral-400'}`}
                                        >
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedUpsells.includes(s.id) ? `border-${accentColor} bg-${accentColor}` : 'border-neutral-600'}`}>
                                                {selectedUpsells.includes(s.id) && <div className="w-2 h-2 bg-black rounded-full" />}
                                            </div>
                                            <span className="text-sm">{s.name}</span>
                                        </div>
                                    ))}
                                    {allServices.length <= 1 && (
                                        <p className="text-xs text-neutral-500 text-center py-2">Nenhum outro serviço disponível.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="active"
                                checked={active}
                                onChange={e => setActive(e.target.checked)}
                                className={`rounded bg-neutral-800 border-neutral-700 text-${accentColor} focus:ring-0`}
                            />
                            <label htmlFor="active" className="text-white text-sm cursor-pointer">
                                Serviço Ativo
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className={`px-6 py-3 bg-${accentColor} text-black font-bold rounded-lg hover:bg-${accentColor}/90 transition-colors flex items-center gap-2`}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Serviço'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
