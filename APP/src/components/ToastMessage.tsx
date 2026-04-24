import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View, Dimensions, Image } from 'react-native';
// @ts-ignore
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');

interface ToastProps {
    visible: boolean;
    message: string;
    type?: 'success' | 'error' | 'info';
    onHide: () => void;
}

const ToastMessage: React.FC<ToastProps> = ({ visible, message, type = 'info', onHide }) => {
    const translateY = useRef(new Animated.Value(-120)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(0.92)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 12,
                    useNativeDriver: true,
                    bounciness: 10,
                    speed: 14,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.spring(scale, {
                    toValue: 1,
                    useNativeDriver: true,
                    bounciness: 8,
                }),
            ]).start();

            const timer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(translateY, {
                        toValue: -120,
                        duration: 280,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scale, {
                        toValue: 0.92,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]).start(() => onHide());
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!visible) return null;

    // Màu & icon theo type
    const config = {
        success: { color: '#22C55E', icon: 'checkmark-circle', label: 'Thành công' },
        error:   { color: '#E63946', icon: 'alert-circle',     label: 'Lỗi' },
        info:    { color: '#3B82F6', icon: 'information-circle', label: 'Thông báo' },
    }[type];

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity,
                    transform: [{ translateY }, { scale }],
                    borderLeftColor: config.color,
                },
            ]}
        >
            {/* Logo badge */}
            <View style={[styles.logoBadge, { borderColor: config.color }]}>
                <Image
                    source={require('../assets/images/logoFood.png')}
                    style={styles.logoImg}
                />
            </View>

            {/* Text */}
            <View style={styles.textContainer}>
                <View style={styles.titleRow}>
                    <Ionicons name={config.icon} size={15} color={config.color} />
                    <Text style={[styles.title, { color: config.color }]}>{config.label}</Text>
                </View>
                <Text style={styles.message} numberOfLines={2}>{message}</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50,
        width: width - 36,
        alignSelf: 'center',
        backgroundColor: '#1A1A2E',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        zIndex: 9999,
        borderLeftWidth: 4,
        // shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 14,
        gap: 12,
    },
    logoBadge: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0F0F1A',
    },
    logoImg: {
        width: 40,
        height: 40,
        resizeMode: 'cover',
        borderRadius: 20,
    },
    textContainer: {
        flex: 1,
        gap: 3,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    title: {
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    message: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.65)',
        lineHeight: 19,
    },
});

export default ToastMessage;
