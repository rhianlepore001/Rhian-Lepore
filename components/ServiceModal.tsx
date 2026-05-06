import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import FocusTrap from 'focus-trap-react';
import { X, Upload, Image as ImageIcon, Loader2, Plus, Check, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PREDEFINED_SERVICES } from '../constants';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

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
    allServices: Service[];
    onClose: () => void;
    onSave: () => void;
    accentColor?: string;
}

export const ServiceModal: React.FC<ServiceModalProps> = ({
    service,
    categories,
    allServices,
    onClose,
    onSave,
    accentColor: _accentColorProp
}) => {
    const { user, region } = useAuth();
    const { isBeauty, accent, colors, classes, font } = useBrutalTheme();
    const suggestions = isBeauty ? PREDEFINED_SERVICES.beauty : PREDEFINED_SERVICES.barber;
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

    // Bloqueia Scroll do Body
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = '';
        };
    }, []);

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
                price: price ? parseFloat(price) : 0,
                duration_minutes: duration === 'custom'
                    ? (parseInt(customHours || '0') * 60) + parseInt(customMinutes || '0')
                    : parseInt(duration),
                category_id: categoryId,
                active,
                image_url: imageUrl
            };

            let serviceId = service?.id;

            if (serviceId) {
                await supabase.from('services').update(serviceData).eq('id', serviceId).eq('user_id', user.id);
            } else {
                const { data, error } = await supabase.from('services').insert(serviceData).select().single();
                if (error) throw error;
                serviceId = data.id;
            }

            // Handle Upsells
            if (serviceId) {
                if (service?.id) {
                    await supabase.from('service_upsells').delete().eq('parent_service_id', serviceId);
                }

                if (selectedUpsells.length > 0) {
                    const upsellData = selectedUpsells.map(upsellId => ({
                        parent_service_id: serviceId,
                        upsell_service_id: upsellId
                    }));
                    await supabase.from('service_upsells').insert(upsellData);
                }
            }

            // Report setup step completed
            window.dispatchEvent(new CustomEvent('setup-step-completed', { detail: { stepId: 'services' } }));

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

        const match = localCategories.find(c => c.name.toLowerCase() === suggestion.category.toLowerCase());
        if (match) {
            setCategoryId(match.id);
        }
    };

    return createPortal(
        <div className={`fixed inset-0 ${classes.modalOverlay} flex items-center justify-center z-[10000] p-4 backdrop-blur-sm`}>
            <div className="absolute inset-0" onClick={onClose} />
            <FocusTrap active={true}>
                <div className={`relative w-full max-w-2xl max-h-[90vh] overflow-y-auto ${classes.modalContainer} transform transition-all duration-300 z-10 modal-enter`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="service-modal-title"
                >
                {/* Header */}
                <div className={`flex items-center justify-between ${classes.modalHeader} sticky top-0 z-10`}>
                    <h3 id="service-modal-title" className={`font-heading text-lg md:text-xl ${colors.text} ${font.heading === 'font-heading' ? 'tracking-wide' : 'tracking-normal'}`}>
                        {service ? 'Editar Serviço' : 'Novo Serviço'}
                    </h3>
                    <button
                        onClick={onClose}
                        className={`${colors.textSecondary} hover:${colors.text} hover:bg-white/10 rounded-full p-1.5 transition-all`}
                        aria-label="Fechar modal de serviço"
                        title="Fechar"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {!service && (
                    <div className={`p-4 border-b ${colors.divider} ${accent.bgDim}`}>
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className={`w-4 h-4 ${accent.text}`} />
                            <span className={`text-xs font-bold uppercase tracking-wider ${colors.textSecondary} ${font.label}`}>Sugestões Rápidas:</span>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                            {suggestions.map((s, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => handleApplySuggestion(s)}
                                    className={`whitespace-nowrap px-3 py-1.5 text-xs text-white transition-all flex items-center gap-2 rounded-xl ${isBeauty
                                        ? `${colors.card} ${accent.border} hover:${accent.bg}`
                                        : `${colors.card} ${colors.border} hover:bg-white/10`
                                        }`}
                                >
                                    {s.name}
                                    <span className={`font-bold ${accent.text}`}>{currencySymbol}{s.price}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <div
                                className={`relative w-full h-48 rounded-lg ${colors.card} border-2 border-dashed ${imagePreview ? 'border-transparent' : colors.border} flex items-center justify-center cursor-pointer hover:${accent.border} overflow-hidden group transition-colors`}
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {imagePreview ? (
                                    <div className="w-full h-full bg-black flex items-center justify-center relative">
                                        <div className="absolute inset-0 scale-125 blur-xl opacity-50">
                                            <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                                        </div>
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
                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageChange} />

                            <div>
                                <label className={`${classes.label} mb-1 block`} htmlFor="service-name">Nome do Serviço</label>
                                <input id="service-name" type="text" required value={name} onChange={e => setName(e.target.value)} className={classes.input} placeholder={isBeauty ? "Ex: Manicure e Pedicure" : "Ex: Corte Degradê"} />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className={`${classes.label} block`} htmlFor="service-category">Categoria</label>
                                    {!isCreatingCategory && (
                                        <button type="button" onClick={() => setIsCreatingCategory(true)} className={`${accent.text} hover:${accent.bgDim} text-xs font-bold flex items-center gap-1 transition-colors`}>
                                            <Plus className="w-3 h-3" /> Nova Categoria
                                        </button>
                                    )}
                                </div>
                                {isCreatingCategory ? (
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <input type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Nome da categoria..." className={`flex-1 ${classes.input}`} autoFocus />
                                            <button type="button" onClick={handleCreateCategory} disabled={!newCategoryName.trim() || savingCategory} className={`px-3 py-2 font-bold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed ${classes.buttonPrimary}`}>
                                                {savingCategory ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
                                            </button>
                                            <button type="button" onClick={() => { setIsCreatingCategory(false); setNewCategoryName(''); }} className={`px-3 py-2 ${classes.buttonSecondary} rounded-lg`}>
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <select id="service-category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className={classes.input}>
                                        <option value="" disabled>Selecione uma categoria</option>
                                        {localCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                    </select>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={`${classes.label} mb-1 block`} htmlFor="service-price">Preço ({currencySymbol})</label>
                                    <input id="service-price" type="number" required step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={classes.input} placeholder="0.00" />
                                </div>
                                <div>
                                    <label className={`${classes.label} mb-1 block`} htmlFor="service-duration">Duração</label>
                                    <select id="service-duration" value={duration} onChange={e => setDuration(e.target.value)} className={classes.input}>
                                        <option value="15">15 min</option>
                                        <option value="30">30 min</option>
                                        <option value="45">45 min</option>
                                        <option value="60">1 hora</option>
                                        <option value="custom">⏱️ Personalizado</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className={`${classes.label} mb-1 block`} htmlFor="service-description">Descrição</label>
                                <textarea id="service-description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className={`${classes.input} resize-none`} placeholder="Detalhes do serviço..." />
                            </div>

                            <div className={`border-t ${colors.divider} pt-4`}>
                                <label className={`${colors.text} font-bold text-sm mb-2 block flex items-center gap-2`}>🚀 Upsells (Sugestões)</label>
                                <div className={`max-h-32 overflow-y-auto space-y-2 ${colors.card} p-2 rounded-lg border ${colors.border}`}>
                                    {allServices.filter(s => s.id !== service?.id).map(s => (
                                        <div key={s.id} onClick={() => toggleUpsell(s.id)} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${selectedUpsells.includes(s.id) ? `${accent.bgDim} ${colors.text}` : `hover:bg-white/5 ${colors.textSecondary}`}`}>
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedUpsells.includes(s.id) ? `${accent.border} ${accent.bg}` : `${colors.border}`}`}>
                                                {selectedUpsells.includes(s.id) && <Check className="w-3 h-3 text-black" />}
                                            </div>
                                            <span className="text-sm">{s.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={`flex items-center justify-between pt-4 border-t ${colors.divider}`}>
                        <div className="flex items-center gap-2">
                            <input type="checkbox" id="active" checked={active} onChange={e => setActive(e.target.checked)} className={`rounded ${colors.inputBg} ${colors.border} ${accent.text} focus:ring-0`} />
                            <label htmlFor="active" className={`${colors.text} text-sm cursor-pointer`}>Serviço Ativo</label>
                        </div>
                        <button type="submit" disabled={loading} className={`px-6 py-3 font-bold rounded-xl flex items-center gap-2 disabled:opacity-50 ${classes.buttonPrimary}`}>
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Serviço'}
                        </button>
                    </div>
                </form>
                </div>
            </FocusTrap>
        </div>,
        document.body
    );
};
