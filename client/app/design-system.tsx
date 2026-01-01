import { View, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { Typography } from '../src/components/ui/Typography';
import { Button } from '../src/components/ui/Button';
import { Input } from '../src/components/ui/Input';
import { Card } from '../src/components/ui/Card';
import { useState } from 'react';
import { cn } from '../src/utils/cn';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function DesignSystemScreen() {
    const [text, setText] = useState('');

    return (
        <SafeAreaView className="flex-1 bg-neutral-50">
            <Stack.Screen options={{ title: 'Design System', headerShadowVisible: false }} />
            <ScrollView contentContainerClassName="p-6 gap-8 pb-10">

                {/* Typography Section */}
                <View className="gap-4">
                    <Typography variant="header" className="border-b border-neutral-200 pb-2">Typography</Typography>
                    <View className="gap-2">
                        <Typography variant="title">Display Title (28px)</Typography>
                        <Typography variant="subtitle">Screen Title (22px)</Typography>
                        <Typography variant="header">Section Header (18px)</Typography>
                        <Typography variant="body">Body text (16px) - The quick brown fox jumps over the lazy dog. Used for main content.</Typography>
                        <Typography variant="secondary">Secondary text (14px) - For supporting information.</Typography>
                        <Typography variant="caption">Caption text (12px) - For small details.</Typography>
                    </View>
                </View>

                {/* Buttons Section */}
                <View className="gap-4">
                    <Typography variant="header" className="border-b border-neutral-200 pb-2">Buttons</Typography>
                    <View className="gap-4">
                        <Button title="Primary Button" onPress={() => { }} />
                        <Button title="Primary Loading" loading onPress={() => { }} />
                        <Button title="Secondary Button" variant="secondary" onPress={() => { }} />
                        <Button title="Disabled Button" disabled onPress={() => { }} />
                    </View>
                </View>

                {/* Inputs Section */}
                <View className="gap-4">
                    <Typography variant="header" className="border-b border-neutral-200 pb-2">Inputs</Typography>
                    <View className="gap-4">
                        <Input
                            label="Standard Input"
                            placeholder="Enter text..."
                            value={text}
                            onChangeText={setText}
                        />
                        <Input
                            label="Error State"
                            placeholder="Invalid input"
                            error="This field is required"
                        />
                        <Input
                            label="Secure Input"
                            placeholder="Password"
                            secureTextEntry
                        />
                    </View>
                </View>

                {/* Cards Section */}
                <View className="gap-4">
                    <Typography variant="header" className="border-b border-neutral-200 pb-2">Cards</Typography>

                    <Card>
                        <Typography variant="subtitle" className="mb-2">Card Title</Typography>
                        <Typography variant="body" className="mb-4 text-neutral-500">
                            Cards have been updated with more padding (24px) and softer borders to feel less "stuffy".
                        </Typography>
                        <Button title="Action" variant="secondary" />
                    </Card>

                    {/* Redesigned Info Card - Modern & Fresh */}
                    <Card variant="info" className="flex-row items-start gap-4">
                        <Ionicons name="information-circle-outline" size={24} color="#0A6ED1" />
                        <View className="flex-1">
                            <Typography variant="header" className="text-primary mb-1 text-[16px]">Did you know?</Typography>
                            <Typography variant="body" className="text-neutral-600 leading-[22px]">
                                This is a modern "Info Card" style. Instead of a heavy border, it uses a soft colored background to feel light and integrated.
                            </Typography>

                        </View>
                    </Card>

                    {/* Additional Variants Demo */}
                    <View className="gap-4 mt-2">
                        <Typography variant="header" className="text-[16px]">Other Variants</Typography>

                        <Card variant="outlined">
                            <Typography variant="subtitle">Outlined Card</Typography>
                            <Typography variant="body" className="text-neutral-500">
                                Useful for secondary content or grouping without a heavy background.
                            </Typography>
                        </Card>

                        <Card variant="ghost">
                            <Typography variant="subtitle">Ghost Card</Typography>
                            <Typography variant="body" className="text-neutral-500">
                                Minimal container, useful for lists or clean layouts.
                            </Typography>
                        </Card>

                        <Card variant="success" className="flex-row items-center gap-3">
                            <Ionicons name="checkmark-circle-outline" size={24} color="#2EBD85" />
                            <View className="flex-1">
                                <Typography variant="header" className="text-success text-[16px]">Success</Typography>
                                <Typography variant="body" className="text-neutral-600">Action completed successfully.</Typography>
                            </View>
                        </Card>

                        <Card variant="warning" className="flex-row items-center gap-3">
                            <Ionicons name="warning-outline" size={24} color="#F4B740" />
                            <View className="flex-1">
                                <Typography variant="header" className="text-warning text-[16px]">Warning</Typography>
                                <Typography variant="body" className="text-neutral-600">Please review your profile details.</Typography>
                            </View>
                        </Card>

                        <Card variant="error" className="flex-row items-center gap-3">
                            <Ionicons name="close-circle-outline" size={24} color="#E5533D" />
                            <View className="flex-1">
                                <Typography variant="header" className="text-error text-[16px]">Error</Typography>
                                <Typography variant="body" className="text-neutral-600">Something went wrong. Try again.</Typography>
                            </View>
                        </Card>
                    </View>
                </View>

                {/* Colors Section */}
                <View className="gap-4">
                    <Typography variant="header" className="border-b border-neutral-200 pb-2">Colors</Typography>
                    <View className="flex-row flex-wrap gap-4">
                        <ColorBox color="bg-primary" label="Primary" />
                        <ColorBox color="bg-primary-dark" label="Dark" />
                        <ColorBox color="bg-primary-soft" label="Soft" />
                        <ColorBox color="bg-accent" label="Accent" />
                        <ColorBox color="bg-success" label="Success" />
                        <ColorBox color="bg-warning" label="Warning" />
                        <ColorBox color="bg-error" label="Error" />
                    </View>
                </View>

            </ScrollView >
        </SafeAreaView >
    );
}

function ColorBox({ color, label }: { color: string, label: string }) {
    return (
        <View className="items-center gap-2">
            <View className={cn("w-16 h-16 rounded-xl shadow-sm", color)} />
            <Typography variant="caption">{label}</Typography>
        </View>
    );
}
