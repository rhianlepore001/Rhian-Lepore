import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Loader2, Plus, Check, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PREDEFINED_SERVICES } from '../constants';

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
    const { user, userType, region } = useAuth();
    const suggestions = userType === 'beauty' ? PREDEFINED_SERVICES.beauty : PREDEFINED_SERVICES.barber;
    const [name, setName] = useState(service?.name || '');
    const [description, setDescription] = useState(service?.description || '');
    const [price, setPrice] = useState(service?.price?.toString() || '');
    const [duration, setDuration] = useState(service?.duration_minutes?.toString() || '30');
    const [customHours, setCustomHours] = useState('0');
    const [customMinutes, setCustomMinutes] = useState('0');
    const [categoryId, setCategoryId] = useState(service?.category_id || categories[0]?.id || '');
    const [active, setActive] = useState(service?.active ?? true);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(service?.image_url || null);

    const [selectedUpsells, setSelectedUpsells] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Category creation states
    const [isCreatingCategory, setIsCreatingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [savingCategory, setSavingCategory] = useState(false);
    const [localCategories, setLocalCategories] = useState<Category[]>(categories);

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
                duration_minutes: duration === 'custom'
                    ? (parseInt(customHours) * 60) + parseInt(customMinutes)
                    : parseInt(duration),
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

    const handleCreateCategory = async () => {
        if (!user || !newCategoryName.trim()) return;
        setSavingCategory(true);

        try {
            const { data, error } = await supabase
                .from('service_categories')
                .insert({
                    user_id: user.id,
                    name: newCategoryName.trim(),
                    display_order: localCategories.length
                })
                .select()
                .single();

            if (error) throw error;

            // Update local categories and select the new one
            setLocalCategories([...localCategories, data]);
            setCategoryId(data.id);
            setNewCategoryName('');
            setIsCreatingCategory(false);
        } catch (error) {
            console.error('Error creating category:', error);
            alert('Erro ao criar categoria');
        } finally {
            setSavingCategory(false);
        }
    };
    const handleApplySuggestion = (suggestion: any) => {
        setName(suggestion.name);
        setPrice(suggestion.price.toString());
        setDuration(suggestion.duration_minutes.toString());

        // Try to find matching category by name
        const match = localCategories.find(c => c.name.toLowerCase() === suggestion.category.toLowerCase());
        if (match) {
            setCategoryId(match.id);
        }
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

                {/* Suggestions Bar */}
                {!service && (
                    <div className="p-4 border-b border-neutral-800 bg-neutral-800/20">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className={`w-4 h-4 text-${accentColor}`} />
                            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Sugestões Rápidas:</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleApplySuggestion(s)}
                                    className="whitespace-nowrap px-3 py-1.5 bg-neutral-800 border border-neutral-700 rounded-full text-xs text-white hover:bg-neutral-700 hover:border-neutral-600 transition-all flex items-center gap-2"
                                >
                                    {s.name}
                                    <span className={`text-${accentColor} font-bold`}>R${s.price}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column: Image & Basic Info */}
                        <div className="space-y-4">
                            <div
                                className={`relative w-full h-48 rounded-lg bg-neutral-800 border-2 border-dashed ${imagePreview ? 'border-transparent' : 'border-neutral-700'} flex items-center justify-center cursor-pointer hover:border-${accentColor} overflow-hidden group transition-colors`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {imagePreview ? (
                                    <div className="w-full h-full bg-black flex items-center justify-center relative">
                                        {/* Blurred Background */}
                                        <div className="absolute inset-0 scale-125 blur-xl opacity-50">
                                            <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                                        </div>
                                        {/* Clear Foreground */}
                                        <img src={imagePreview} alt="Preview" className="relative z-10 max-w-full max-h-full object-contain p-2 shadow-2xl" />
                                    </div>
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
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-white font-mono text-xs block">Categoria</label>
                                    {!isCreatingCategory && (
                                        <button
                                            type="button"
                                            onClick={() => setIsCreatingCategory(true)}
                                            className={`text-${accentColor} hover:text-${accentColor}/80 text-xs font-bold flex items-center gap-1 transition-colors`}
                                        >
                                            <Plus className="w-3 h-3" />
                                            Nova Categoria
                                        </button>
                                    )}
                                </div>

                                {isCreatingCategory ? (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={newCategoryName}
                                                onChange={e => setNewCategoryName(e.target.value)}
                                                placeholder="Nome da categoria..."
                                                className={`flex-1 p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleCreateCategory();
                                                    } else if (e.key === 'Escape') {
                                                        setIsCreatingCategory(false);
                                                        setNewCategoryName('');
                                                    }
                                                }}
                                                autoFocus
                                            />
                                            <button
                                                type="button"
                                                onClick={handleCreateCategory}
                                                disabled={!newCategoryName.trim() || savingCategory}
                                                className={`px-3 py-2 bg-${accentColor} text-black rounded-lg hover:bg-${accentColor}/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {savingCategory ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsCreatingCategory(false);
                                                    setNewCategoryName('');
                                                }}
                                                className="px-3 py-2 bg-neutral-700 text-white rounded-lg hover:bg-neutral-600 transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                        <p className="text-xs text-neutral-500">Pressione Enter para salvar ou Esc para cancelar</p>
                                    </div>
                                ) : (
                                    <select
                                        value={categoryId}
                                        onChange={e => setCategoryId(e.target.value)}
                                        className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                                    >
                                        <option value="" disabled>Selecione uma categoria</option>
                                        {localCategories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                )}
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
                                    <label className="text-white font-mono text-xs mb-1 block">Duração</label>
                                    <select
                                        value={duration}
                                        onChange={e => setDuration(e.target.value)}
                                        className={`w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-${accentColor}`}
                                    >
                                        <option value="15">15 min</option>
                                        <option value="30">30 min</option>
                                        <option value="45">45 min</option>
                                        <option value="60">1 hora</option>
                                        <option value="90">1h 30min</option>
                                        <option value="120">2 horas</option>
                                        <option value="180">3 horas</option>
                                        <option value="240">4 horas</option>
                                        <option value="custom">⏱️ Personalizado</option>
                                    </select>

                                    {duration === 'custom' && (
                                        <div className="mt-3 p-3 bg-neutral-800/50 border border-neutral-700 rounded-lg space-y-2">
                                            <p className="text-xs text-neutral-400 mb-2">Duração Personalizada:</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <label className="text-xs text-neutral-500 block mb-1">Horas</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="12"
                                                        value={customHours}
                                                        onChange={e => setCustomHours(e.target.value)}
                                                        className={`w-full p-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:border-${accentColor}`}
                                                        placeholder="0"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs text-neutral-500 block mb-1">Minutos</label>
                                                    <select
                                                        value={customMinutes}
                                                        onChange={e => setCustomMinutes(e.target.value)}
                                                        className={`w-full p-2 bg-neutral-900 border border-neutral-700 rounded text-white focus:outline-none focus:border-${accentColor}`}
                                                    >
                                                        <option value="0">0</option>
                                                        <option value="15">15</option>
                                                        <option value="30">30</option>
                                                        <option value="45">45</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <p className={`text-xs text-${accentColor} font-mono mt-2`}>
                                                Total: {customHours}h {customMinutes}min = {(parseInt(customHours) * 60) + parseInt(customMinutes)} minutos
                                            </p>
                                        </div>
                                    )}
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
