import React, { useRef } from 'react';
import { Upload, Image as ImageIcon, Trash2 } from 'lucide-react';

interface BrandIdentitySectionProps {
    logoPreview: string | null;
    coverPreview: string | null;
    onLogoChange: (file: File) => void;
    onCoverChange: (file: File) => void;
    onLogoRemove: () => void;
    onCoverRemove: () => void;
    accentColor: string;
}

export const BrandIdentitySection: React.FC<BrandIdentitySectionProps> = ({
    logoPreview,
    coverPreview,
    onLogoChange,
    onCoverChange,
    onLogoRemove,
    onCoverRemove,
    accentColor
}) => {
    const logoInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover') => {
        if (e.target.files && e.target.files[0]) {
            if (type === 'logo') {
                onLogoChange(e.target.files[0]);
            } else {
                onCoverChange(e.target.files[0]);
            }
        }
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-4 md:p-6 mb-4 md:mb-6">
            <h3 className="text-white font-bold text-base md:text-lg mb-4">
                Identidade Visual
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Logo Upload */}
                <div className="col-span-1">
                    <label className="text-white font-mono text-xs md:text-sm mb-2 block">
                        Logotipo (Quadrado)
                    </label>
                    <div className="relative group">
                        <div
                            className={`w-32 h-32 rounded-full border-2 border-dashed ${logoPreview ? 'border-transparent' : 'border-neutral-700'} bg-neutral-800 flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-${accentColor} transition-colors`}
                            onClick={() => logoInputRef.current?.click()}
                        >
                            {logoPreview ? (
                                <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-2">
                                    <Upload className="w-6 h-6 text-neutral-500 mx-auto mb-1" />
                                    <span className="text-xs text-neutral-500">Upload</span>
                                </div>
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Upload className="w-6 h-6 text-white" />
                            </div>
                        </div>

                        {logoPreview && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onLogoRemove();
                                }}
                                className="absolute top-0 right-0 bg-red-500/80 p-1.5 rounded-full text-white hover:bg-red-600 transition-colors transform translate-x-1/4 -translate-y-1/4"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={logoInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'logo')}
                    />
                    <p className="text-neutral-400 text-xs mt-2">
                        Recomendado: 500x500px
                    </p>
                </div>

                {/* Cover Upload */}
                <div className="col-span-1 md:col-span-2">
                    <label className="text-white font-mono text-xs md:text-sm mb-2 block">
                        Foto de Capa
                    </label>
                    <div className="relative group">
                        <div
                            className={`w-full h-32 md:h-48 rounded-lg border-2 border-dashed ${coverPreview ? 'border-transparent' : 'border-neutral-700'} bg-neutral-800 flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-${accentColor} transition-colors`}
                            onClick={() => coverInputRef.current?.click()}
                        >
                            {coverPreview ? (
                                <img src={coverPreview} alt="Cover Preview" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center">
                                    <ImageIcon className="w-8 h-8 text-neutral-500 mx-auto mb-2" />
                                    <span className="text-sm text-neutral-500">Clique para fazer upload da capa</span>
                                </div>
                            )}

                            {/* Hover Overlay */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Upload className="w-8 h-8 text-white" />
                            </div>
                        </div>

                        {coverPreview && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCoverRemove();
                                }}
                                className="absolute top-2 right-2 bg-red-500/80 p-2 rounded-full text-white hover:bg-red-600 transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <input
                        type="file"
                        ref={coverInputRef}
                        className="hidden"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'cover')}
                    />
                    <p className="text-neutral-400 text-xs mt-2">
                        Aparece no topo da sua página de agendamento. Recomendado: 1920x1080px
                    </p>
                </div>
            </div>
        </div>
    );
};
