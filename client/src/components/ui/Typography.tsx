import { Text, TextProps } from 'react-native';
import { cn } from '../../utils/cn';

interface TypographyProps extends TextProps {
    variant?: 'title' | 'subtitle' | 'header' | 'body' | 'secondary' | 'caption';
    color?: string;
    className?: string;
}

export function Typography({ variant = 'body', className, style, ...props }: TypographyProps) {
    const baseStyles = 'font-sans';

    const variants = {
        title: 'text-[28px] font-semibold text-neutral-900',
        subtitle: 'text-[22px] font-semibold text-neutral-900',
        header: 'text-[18px] font-medium text-neutral-900',
        body: 'text-[16px] font-regular text-neutral-900',
        secondary: 'text-[14px] font-regular text-neutral-500',
        caption: 'text-[12px] font-regular text-neutral-400',
    };

    return (
        <Text
            className={cn(baseStyles, variants[variant], className)}
            style={style}
            {...props}
        />
    );
}
