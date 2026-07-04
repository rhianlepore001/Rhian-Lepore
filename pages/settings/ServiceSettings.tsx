import React, { useState } from 'react';
import { Card, Button } from '../../components/ui';
import { SettingsLayout } from '../../components/SettingsLayout';
import { Plus, Package, Edit2, Trash2, GripVertical, FolderPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import {
    useCreateServiceCategory,
    useDeleteServiceCategory,
    useServiceSettings,
} from '../../hooks/useServiceSettings';
import { ServiceModal } from '../../components/ServiceModal';
import { Modal } from '../../components/Modal';
import { formatCurrency } from '../../utils/formatters';
import type { ServiceItem } from '@/types/serviceSettings';

export const ServiceSettings: React.FC = () => {
    const { companyId, user, region } = useAuth();
    const effectiveCompanyId = companyId ?? user?.id ?? null;
    const { accent, colors, classes, isBeauty } = useBrutalTheme();
    const { categories, services, loading, refetch } = useServiceSettings(effectiveCompanyId);
    const createCategory = useCreateServiceCategory();
    const deleteCategory = useDeleteServiceCategory();

    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<ServiceItem | null>(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const handleAddCategory = async () => {
        if (!newCategoryName.trim() || !effectiveCompanyId) return;
        try {
            await createCategory.mutateAsync({
                companyId: effectiveCompanyId,
                name: newCategoryName,
                displayOrder: categories.length,
            });
            setNewCategoryName('');
            setIsCategoryModalOpen(false);
        } catch (error) {
            console.error('Error adding category:', error);
        }
    };

    const handleDeleteCategory = async (id: string) => {
        if (!confirm('Tem certeza? Isso pode afetar serviços vinculados.') || !effectiveCompanyId) return;
        try {
            await deleteCategory.mutateAsync({ companyId: effectiveCompanyId, categoryId: id });
        } catch (error) {
            console.error('Error deleting category:', error);
        }
    };

    return (
        <SettingsLayout>
            <div className="max-w-5xl pb-20 md:pb-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div className="flex-1" />
                    <div className="flex gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="flex-1 md:flex-none"
                        >
                            <FolderPlus className="w-5 h-5 mr-2" />
                            <span>Categoria</span>
                        </Button>
                        <Button
                            id="btn-add-service"
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
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className={colors.textSecondary}>Carregando...</div>
                ) : categories.length === 0 ? (
                    <div className={`${colors.inputBg} border ${colors.border} rounded-2xl p-12 text-center`}>
                        <div className={`w-16 h-16 ${colors.inputBg} rounded-full flex items-center justify-center mx-auto mb-4 border ${colors.border}`}>
                            <Package className={`w-8 h-8 ${colors.textMuted}`} />
                        </div>
                        <h3 className={`${colors.text} font-bold text-lg mb-2`}>
                            Comece organizando seu menu
                        </h3>
                        <p className={`${colors.textMuted} mb-6 max-w-md mx-auto`}>
                            Crie categorias (ex: Cabelo, Barba) para agrupar seus serviços.
                        </p>
                        <button
                            onClick={() => setIsCategoryModalOpen(true)}
                            className={`px-6 py-3 ${accent.bg} text-[var(--color-bg)] font-bold rounded-xl ${accent.bgHover} transition-colors`}
                        >
                            Criar Primeira Categoria
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {categories.map(category => {
                            const categoryServices = services.filter(s => s.category_id === category.id);
                            return (
                                <Card
                                    key={category.id}
                                    noPadding
                                    title={
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-3">
                                                <GripVertical className={`w-4 h-4 ${colors.textMuted} cursor-move`} />
                                                <span>{category.name}</span>
                                                <span className={`text-xs ${colors.inputBg} border ${colors.border} px-2 py-0.5 rounded-full ${colors.textMuted}`}>
                                                    {categoryServices.length}
                                                </span>
                                            </div>
                                        </div>
                                    }
                                    action={
                                        <button
                                            onClick={() => handleDeleteCategory(category.id)}
                                            className={`${colors.textMuted} hover:text-red-400 p-2 transition-colors active:scale-[0.97]`}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    }
                                >
                                    <div className={`divide-y ${colors.divider}`}>
                                        {categoryServices.length === 0 ? (
                                            <div className={`p-12 text-center ${colors.textMuted} text-sm italic`}>
                                                Nenhum serviço nesta categoria.
                                            </div>
                                        ) : (
                                            categoryServices.map(service => (
                                                <div
                                                    key={service.id}
                                                    className={`p-4 flex items-center gap-4 hover:bg-white/5 transition-all group cursor-pointer active:scale-[0.99]`}
                                                    onClick={() => {
                                                        setEditingService(service);
                                                        setIsServiceModalOpen(true);
                                                    }}
                                                >
                                                    <div className={`w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center relative border ${colors.border} shadow-inner ${colors.inputBg}`}>
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
                                                            <h4 className={`${colors.text} font-bold tracking-tight truncate`}>{service.name}</h4>
                                                            {!service.active && (
                                                                <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded uppercase font-bold">Inativo</span>
                                                            )}
                                                        </div>
                                                        <p className={`text-sm font-mono ${colors.textMuted}`}>
                                                            {service.duration_minutes}m • <span className={accent.text}>{formatCurrency(service.price, region)}</span>
                                                        </p>
                                                    </div>

                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <div className={`p-2 ${colors.textMuted} hover:${colors.text}`}>
                                                            <Edit2 className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                )}

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
                            w-full p-3 outline-none transition-all duration-300
                            ${isBeauty
                                ? 'bg-beauty-dark/50 border border-beauty-neon/20 rounded-xl focus:border-beauty-neon focus:shadow-neon'
                                : 'bg-neutral-800 border-2 border-neutral-700 focus:border-accent-gold'
                            }
                            ${colors.text}
                        `}
                        autoFocus
                    />
                </Modal>

                {isServiceModalOpen && effectiveCompanyId && (
                    <ServiceModal
                        companyId={effectiveCompanyId}
                        service={editingService}
                        categories={categories}
                        allServices={services}
                        onClose={() => setIsServiceModalOpen(false)}
                        onSave={() => { void refetch(); }}
                    />
                )}
            </div>
        </SettingsLayout>
    );
};
