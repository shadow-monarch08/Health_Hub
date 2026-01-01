import { TouchableOpacity, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { cn } from '../../utils/cn';
import { Typography } from './Typography';

interface ButtonProps extends TouchableOpacityProps {
    variant?: 'primary' | 'secondary';
    title: string;
    loading?: boolean;
}

export function Button({
    variant = 'primary',
    title,
    loading = false,
    disabled,
    className,
    ...props
}: ButtonProps) {
    const baseStyles = 'h-[52px] rounded-2xl flex-row items-center justify-center px-4';

    const variants = {
        primary: 'bg-primary border border-transparent active:bg-primary-dark',
        secondary: 'bg-transparent border border-primary active:bg-primary-soft',
    };

    const disabledStyles = 'bg-neutral-200 border-neutral-200';
    const disabledTextStyles = 'text-neutral-400';

    const textStyles = {
        primary: 'text-white',
        secondary: 'text-primary',
    };

    return (
        <TouchableOpacity
            className={cn(
                baseStyles,
                variants[variant],
                disabled && disabledStyles,
                className
            )}
            disabled={disabled || loading}
            activeOpacity={0.8}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'primary' ? 'white' : '#0A6ED1'} />
            ) : (
                <Typography
                    variant="body"
                    className={cn(
                        'font-medium',
                        textStyles[variant],
                        disabled && disabledTextStyles
                    )}
                >
                    {title}
                </Typography>
            )}
        </TouchableOpacity>
    );
}
