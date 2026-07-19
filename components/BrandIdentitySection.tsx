import React, { useRef } from 'react';
import { Upload, Image as ImageIcon, Trash2 } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface BrandIdentitySectionProps {
    logoPreview: string | null;
    coverPreview: string | null;
    onLogoChange: (file: File) => void;
    onCoverChange: (file: File) => void;
    onLogoRemove: () => void;
    onCoverRemove: () => void;
}

export const BrandIdentitySection: React.FC<BrandIdentitySectionProps> = ({
    logoPreview,
    coverPreview,
    onLogoChange,
    onCoverChange,
    onLogoRemove,
    onCoverRemove,
}) => {
    const { accent, colors } = useBrutalTheme();
    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
        if (e.target.files && e.target.files[0]) {
            if (type === 'logo') onLogoChange(e.target.files[0]);
            else onCoverChange(e.target.files[0]);
        }
    };

    const UploadZone = ({
        preview,
        onClick,
        onRemove,
        icon,
        label,
        helper,
        aspect,
    }: {
        preview: string | null;
        onClick: () => void;
        onRemove: (e: React.MouseEvent) => void;
        icon: React.ReactNode;
        label: string;
        helper: string;
        aspect: 'square' | 'wide';
    }) => (
        <div className="relative group">
            <div
                onClick={onClick}
                className={`
                    relative overflow-hidden cursor-pointer transition-all duration-200
                    ${aspect === 'square' ? 'w-28 h-28 md:w-36 md:h-36 rounded-2xl' : 'w-full h-32 md:h-48 rounded-xl'}
                    ${colors.inputBg} ${colors.border} border-2 border-dashed
                    hover:border-[var(--color-accent-border)]
                    flex items-center justify-center
                `}
            >
                {preview ? (
                    <img src={preview} alt={label} className="w-full h-full object-cover" />
                ) : (
                    <div className="text-center p-3">
                        {icon}
                        <span className={`text-xs ${colors.textMuted} block mt-1`}>Clique para enviar</span>
                    </div>
                )}

                {/* Hover Overlay */}
                <div className={`
                    absolute inset-0 ${colors.overlay} opacity-0 group-hover:opacity-100
                    flex items-center justify-center transition-opacity duration-200
                `}>
                    <Upload className={`w-6 h-6 ${colors.text}`} />
                </div>
            </div>

            {preview && (
                <button
                    onClick={onRemove}
                    className="absolute -top-2 -right-2 bg-[var(--color-danger)]/90 p-1.5 rounded-full text-[var(--color-text)] hover:brightness-110 transition-colors shadow-lg"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            )}

            <p className={`${colors.textMuted} text-xs mt-2`}>{helper}</p>
        </div>
    );

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {/* Logo Upload */}
            <div>
                <label className={`${colors.textSecondary} font-mono text-xs md:text-sm mb-3 block`}>
                    Logotipo (Quadrado)
                </label>
                <UploadZone
                    preview={logoPreview}
                    onClick={() => logoInputRef.current?.click()}
                    onRemove={(e) => {
                        e.stopPropagation();
                        onLogoRemove();
                    }}
                    icon={<ImageIcon className={`w-6 h-6 ${colors.textMuted} mx-auto`} />}
                    label="Logotipo"
                    helper="Recomendado: 500x500px"
                    aspect="square"
                />
                <input
                    type="file"
                    ref={logoInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'logo')}
                />
            </div>

            {/* Cover Upload */}
            <div className="md:col-span-2">
                <label className={`${colors.textSecondary} font-mono text-xs md:text-sm mb-3 block`}>
                    Foto de Capa
                </label>
                <UploadZone
                    preview={coverPreview}
                    onClick={() => coverInputRef.current?.click()}
                    onRemove={(e) => {
                        e.stopPropagation();
                        onCoverRemove();
                    }}
                    icon={<ImageIcon className={`w-8 h-8 ${colors.textMuted} mx-auto`} />}
                    label="Capa"
                    helper="Aparece no topo da página de agendamento. Recomendado: 1920x1080px"
                    aspect="wide"
                />
                <input
                    type="file"
                    ref={coverInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, 'cover')}
                />
            </div>
        </div>
    );
};
