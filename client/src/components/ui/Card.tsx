import { View, ViewProps } from 'react-native';
import { cn } from '../../utils/cn';

interface CardProps extends ViewProps {
    className?: string;
    variant?: 'default' | 'outlined' | 'ghost' | 'info' | 'success' | 'warning' | 'error';
}

export function Card({ className, variant = 'default', ...props }: CardProps) {
    const variants = {
        default: "bg-neutral-white border border-neutral-100 shadow-sm",
        outlined: "bg-transparent border border-neutral-200 shadow-none",
        ghost: "bg-transparent border-none shadow-none",
        info: "bg-primary/5 border-none shadow-none",
        success: "bg-success/5 border-none shadow-none",
        warning: "bg-warning/5 border-none shadow-none",
        error: "bg-error/5 border-none shadow-none",
    };

    return (
        <View
            className={cn(
                "rounded-[24px] p-6",
                variants[variant],
                className
            )}
            {...props}
        />
    );
}
