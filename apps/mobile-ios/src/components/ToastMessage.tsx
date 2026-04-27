import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View, Dimensions } from 'react-native';
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
    const scale = useRef(new Animated.Value(0.95)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(translateY, {
                    toValue: 20,
                    useNativeDriver: true,
                    bounciness: 12,
                    speed: 16,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.spring(scale, {
                    toValue: 1,
                    useNativeDriver: true,
                    bounciness: 10,
                }),
            ]).start();

            const timer = setTimeout(() => {
                Animated.parallel([
                    Animated.timing(translateY, {
                        toValue: -120,
                        duration: 350,
                        useNativeDriver: true,
                    }),
                    Animated.timing(opacity, {
                        toValue: 0,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scale, {
                        toValue: 0.95,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                ]).start(() => onHide());
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!visible) return null;

    const config = {
        success: { color: '#34C759', icon: 'checkmark-circle' },
        error:   { color: '#FF3B30', icon: 'close-circle' },
        info:    { color: '#0A84FF', icon: 'information-circle' },
    }[type];

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity,
                    transform: [{ translateY }, { scale }],
                },
            ]}
        >
            <Ionicons name={config.icon} size={22} color={config.color} style={styles.icon} />
            <View style={styles.textContainer}>
                {!!message ? (
                    <Text style={styles.message} numberOfLines={2}>{message}</Text>
                ) : null}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 55,
        maxWidth: width - 48,
        minWidth: 160,
        alignSelf: 'center',
        backgroundColor: 'rgba(28, 28, 30, 0.96)', // Sắc den mờ kính hiện đại
        borderRadius: 40, // Bo cong viên nang
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        zIndex: 9999,
        // Bóng đổ mịn, phân tán
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 25,
        elevation: 10,
    },
    icon: {
        marginRight: 10,
    },
    textContainer: {
        flexShrink: 1,
        justifyContent: 'center',
    },
    message: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
        lineHeight: 18,
        letterSpacing: 0.3,
    },
});

export default ToastMessage;
