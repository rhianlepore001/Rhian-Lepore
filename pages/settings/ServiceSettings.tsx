import React, { useState, useEffect } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { Plus, Package, Edit2, Trash2, GripVertical, FolderPlus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ServiceModal } from '../../components/ServiceModal';
import { BrutalCard } from '../../components/BrutalCard';
import { BrutalButton } from '../../components/BrutalButton';
import { Modal } from '../../components/Modal';
import { formatCurrency } from '../../utils/formatters';

export const ServiceSettings: React.FC = () => {
    const { user, userType, region } = useAuth();
    const [categories, setCategories] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<any>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';

    useEffect(() => {
        fetchData();
    }, [user]);

    const fetchData = async () => {
        if (!user) return;
        try {
            // Removed .order('display_order') as the column does not exist in the services table
            const [catRes, servRes] = await Promise.all([
                supabase.from('service_categories').select('*').eq('user_id', user.id).order('display_order'),
                supabase.from('services').select('*').eq('user_id', user.id)
            ]);

            setCategories(catRes.data || []);
            setServices(servRes.data || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim() || !user) return;
        try {
            await supabase.from('service_categories').insert({
                user_id: user.id,
                name: newCategoryName,
                display_order: categories.length
            });
            setNewCategoryName('');
            setIsCategoryModalOpen(false);
            fetchData();
        } catch (error) {
            console.error('Error adding category:', error);
        }
    };

    const handleDeleteService = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este serviço?')) return;
        try {
            await supabase.from('services').delete().eq('id', id).eq('user_id', user.id);
            fetchData();
        } catch (error) {
            console.error('Error deleting service:', error);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Tem certeza? Isso pode afetar serviços vinculados.')) return;
        try {
            await supabase.from('service_categories').delete().eq('id', id).eq('user_id', user.id);
            fetchData();
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    return (
        <SettingsLayout>
            <div className="max-w-5xl pb-20 md:pb-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    {/* Título gerenciado pelo Layout */}
                    <div className="flex-1" />
                    <div className="flex gap-3">
                        <BrutalButton
                            variant="secondary"
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="flex-1 md:flex-none"
                        >
                            <FolderPlus className="w-5 h-5 mr-2" />
                            <span>Categoria</span>
                        </BrutalButton>
                        <BrutalButton
                            onClick={() => {
                                if (categories.length === 0) {
                                    alert('Crie uma categoria primeiro!');
                                    setIsCategoryModalOpen(true);
                                    return;
                                }
                                setEditingService(null);
                                setIsServiceModalOpen(true);
                            }}
                            className="flex-1 md:flex-none"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            <span>Serviço</span>
                        </BrutalButton>
                    </div>
                </div>

                {loading ? (
                    <div className="text-white">Carregando...</div>
                ) : categories.length === 0 ? (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-12 text-center">
                        <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Package className="w-8 h-8 text-neutral-500" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">
                            Comece organizando seu menu
                        </h3>
                        <p className="text-neutral-400 mb-6 max-w-md mx-auto">
                            Crie categorias (ex: Cabelo, Barba) para agrupar seus serviços.
                        </p>
                        <button
                            onClick={() => setIsCategoryModalOpen(true)}
                            className={`px-6 py-3 bg-${accentColor} text-black font-bold rounded-lg hover:bg-${accentColor}/90 transition-colors`}
                        >
                            Criar Primeira Categoria
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {categories.map(category => {
                            const categoryServices = services.filter(s => s.category_id === category.id);
                            return (
                                <BrutalCard
                                    key={category.id}
                                    noPadding
                                    title={
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3">
                                                <GripVertical className="w-4 h-4 text-white/20 cursor-move" />
                                                <span>{category.name}</span>
                                                <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-neutral-400">
                                                    {categoryServices.length}
                                                </span>
                                            </div>
                                        </div>
                                    }
                                    action={
                                        <button
                                            onClick={() => handleDeleteCategory(category.id)}
                                            className="text-neutral-500 hover:text-red-400 p-2 transition-colors active:animate-haptic-click"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    }
                                >
                                    <div className="divide-y divide-white/5">
                                        {categoryServices.length === 0 ? (
                                            <div className="p-12 text-center text-neutral-500 text-sm italic">
                                                Nenhum serviço nesta categoria.
                                            </div>
                                        ) : (
                                            categoryServices.map(service => (
                                                <div
                                                    key={service.id}
                                                    className="p-4 flex items-center gap-4 hover:bg-white/5 transition-all group cursor-pointer active:scale-[0.99] active:animate-haptic-click"
                                                    onClick={() => {
                                                        setEditingService(service);
                                                        setIsServiceModalOpen(true);
                                                    }}
                                                >
                                                    <div className="w-14 h-14 rounded-2xl bg-black/40 overflow-hidden flex-shrink-0 flex items-center justify-center relative border border-white/5 shadow-inner">
                                                        {service.image_url ? (
                                                            <>
                                                                <div className="absolute inset-0 scale-125 blur-md opacity-20">
                                                                    <img src={service.image_url} alt="" className="w-full h-full object-cover" />
                                                                </div>
                                                                <img src={service.image_url} alt={service.name} className="relative z-10 max-w-full max-h-full object-cover" />
                                                            </>
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-white/10">
                                                                <Package className="w-6 h-6" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <h4 className="text-white font-bold tracking-tight truncate">{service.name}</h4>
                                                            {!service.active && (
                                                                <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded uppercase font-bold">Inativo</span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm font-mono text-neutral-400">
                                                            {service.duration_minutes}m • <span className={isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}>{formatCurrency(service.price, region)}</span>
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className="p-2 text-neutral-500 hover:text-white">
                                                            <Edit2 className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </BrutalCard>
                            );
                        })}
                    </div>
                )}

                {/* Category Modal */}
                <Modal
                    isOpen={isCategoryModalOpen}
                    onClose={() => setIsCategoryModalOpen(false)}
                    title="Nova Categoria"
                    size="sm"
                    footer={
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setIsCategoryModalOpen(false)}
                                className={`px-4 py-2 rounded-lg transition-all ${isBeauty ? 'text-beauty-neon/70 hover:text-beauty-neon hover:bg-beauty-neon/10' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleAddCategory}
                                className={`px-5 py-2.5 font-bold transition-all ${isBeauty
                                    ? 'bg-gradient-to-r from-beauty-neon to-beauty-acid text-white rounded-xl hover:shadow-neon'
                                    : 'bg-accent-gold text-black hover:bg-accent-goldHover shadow-heavy-sm hover:shadow-heavy'
                                    }`}
                            >
                                Salvar
                            </button>
                        </div>
                    }
                >
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        placeholder="Ex: Cabelo, Barba, Tratamentos..."
                        className={`
                            w-full p-3 text-white outline-none transition-all duration-300
                            ${isBeauty
                                ? 'bg-beauty-dark/50 border border-beauty-neon/20 rounded-xl focus:border-beauty-neon focus:shadow-neon'
                                : 'bg-neutral-800 border-2 border-neutral-700 focus:border-accent-gold'
                            }
                        `}
                        autoFocus
                    />
                </Modal>

                {/* Service Modal */}
                {isServiceModalOpen && (
                    <ServiceModal
                        service={editingService}
                        categories={categories}
                        allServices={services}
                        onClose={() => setIsServiceModalOpen(false)}
                        onSave={fetchData}
                        accentColor={accentColor}
                    />
                )}
            </div>
        </SettingsLayout>
    );
};
