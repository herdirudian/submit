"use client";

import { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw, Check } from "lucide-react";
import Image from "next/image";

type ImageZoomModalProps = {
    isOpen: boolean;
    onClose: () => void;
    imageUrl: string | null;
    title: string;
    subtitle?: string;
    onSelect?: () => void;
    isSelected?: boolean;
};

export default function ImageZoomModal({
    isOpen,
    onClose,
    imageUrl,
    title,
    subtitle,
    onSelect,
    isSelected = false,
}: ImageZoomModalProps) {
    const [scale, setScale] = useState(1);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (isOpen) {
            setScale(1);
            setPosition({ x: 0, y: 0 });
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
        return () => {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);

    if (!isOpen || !imageUrl) return null;

    const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.5, 4));
    const handleZoomOut = () => {
        setScale((prev) => {
            const next = Math.max(prev - 0.5, 1);
            if (next === 1) setPosition({ x: 0, y: 0 });
            return next;
        });
    };
    const handleReset = () => {
        setScale(1);
        setPosition({ x: 0, y: 0 });
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        if (e.deltaY < 0) {
            setScale((prev) => Math.min(prev + 0.25, 4));
        } else {
            setScale((prev) => {
                const next = Math.max(prev - 0.25, 1);
                if (next === 1) setPosition({ x: 0, y: 0 });
                return next;
            });
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (scale > 1) {
            setIsDragging(true);
            setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging && scale > 1) {
            setPosition({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        }
    };

    const handleMouseUp = () => setIsDragging(false);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
            {/* Header Controls */}
            <div className="flex items-center justify-between p-4 md:px-8 bg-slate-900/80 border-b border-slate-800 text-white z-10">
                <div className="max-w-md truncate">
                    <h3 className="text-lg font-bold truncate">{title}</h3>
                    {subtitle && <p className="text-xs text-slate-400 truncate">{subtitle}</p>}
                </div>

                {/* Zoom controls & Actions */}
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="flex items-center bg-slate-800 rounded-xl p-1 border border-slate-700">
                        <button
                            onClick={handleZoomOut}
                            disabled={scale <= 1}
                            className="p-2 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-700"
                            title="Zoom Out (-)"
                        >
                            <ZoomOut size={18} />
                        </button>
                        <span className="text-xs font-mono font-bold px-2 text-slate-300 min-w-[50px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={handleZoomIn}
                            disabled={scale >= 4}
                            className="p-2 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-700"
                            title="Zoom In (+)"
                        >
                            <ZoomIn size={18} />
                        </button>
                        <button
                            onClick={handleReset}
                            className="p-2 text-slate-300 hover:text-white transition-colors rounded-lg hover:bg-slate-700 border-l border-slate-700 ml-1"
                            title="Reset Zoom"
                        >
                            <RotateCcw size={16} />
                        </button>
                    </div>

                    {onSelect && (
                        <button
                            onClick={() => {
                                onSelect();
                                onClose();
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-lg ${
                                isSelected
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                    : "bg-primary-600 hover:bg-primary-700 text-white"
                            }`}
                        >
                            <Check size={16} />
                            {isSelected ? "Terpilih" : "Pilih Opsi Ini"}
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors border border-slate-700 ml-2"
                        title="Tutup (Esc)"
                    >
                        <X size={20} />
                    </button>
                </div>
            </div>

            {/* Image Canvas Container */}
            <div
                className={`flex-1 relative flex items-center justify-center overflow-hidden select-none ${
                    scale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                }`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={(e) => {
                    if (e.target === e.currentTarget) onClose();
                }}
            >
                <div
                    className="relative transition-transform duration-150 ease-out max-w-full max-h-full flex items-center justify-center p-4"
                    style={{
                        transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                    }}
                >
                    <Image
                        src={imageUrl}
                        alt={title}
                        width={1200}
                        height={1200}
                        className="object-contain max-h-[85vh] max-w-[90vw] rounded-2xl shadow-2xl pointer-events-none"
                        unoptimized
                    />
                </div>
            </div>
            
            {/* Helper tooltip footer */}
            <div className="py-2 text-center text-xs text-slate-500 bg-slate-950/80 z-10">
                Gunakan scroll mouse atau tombol + / - untuk zoom gambar. Klik & geser untuk menggeser gambar.
            </div>
        </div>
    );
}
