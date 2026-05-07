import React from 'react';
import {
    View, Modal, StyleSheet, Text, TouchableOpacity, Dimensions
} from 'react-native';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertModalProps {
    visible: boolean;
    type?: AlertType;
    title: string;
    message: string;
    onClose: () => void;
}

const { width } = Dimensions.get('window');

const AlertModal: React.FC<AlertModalProps> = ({
    visible,
    type = 'info',
    title,
    message,
    onClose,
}) => {
    const getColors = () => {
        switch (type) {
            case 'success': return { bg: '#E8F5E9', icon: '#4CAF50', border: '#4CAF50' };
            case 'error':   return { bg: '#FFEBEE', icon: '#F44336', border: '#F44336' };
            case 'warning': return { bg: '#FFF8E1', icon: '#FF9800', border: '#FF9800' };
            default:        return { bg: '#E3F2FD', icon: '#2196F3', border: '#2196F3' };
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'success': return '✓';
            case 'error':   return '✕';
            case 'warning': return '!';
            default:        return 'i';
        }
    };

    const colors = getColors();

    return (
        <Modal transparent={true} animationType="fade" visible={visible} onRequestClose={onClose}>
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity activeOpacity={1} style={[styles.modalContainer, { borderColor: colors.border }]}>
                    <View style={[styles.iconCircle, { backgroundColor: colors.bg }]}>
                        <Text style={[styles.icon, { color: colors.icon }]}>{getIcon()}</Text>
                    </View>

                    <Text style={[styles.title, { color: colors.icon }]}>{title}</Text>
                    <Text style={styles.message}>{message}</Text>

                    <TouchableOpacity style={[styles.button, { backgroundColor: colors.border }]} onPress={onClose}>
                        <Text style={styles.buttonText}>Đóng</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
};

export const showAlert = (
    title: string,
    message: string,
    type: AlertType = 'info'
): Promise<void> => {
    return new Promise((resolve) => {
        // Simple approach - just use Alert.alert for now, but structure is ready
        const { Alert } = require('react-native');
        Alert.alert(title, message, [{ text: 'Đóng', onPress: resolve }]);
    });
};

export const confirmAlert = (
    title: string,
    message: string
): Promise<boolean> => {
    return new Promise((resolve) => {
        const { Alert } = require('react-native');
        Alert.alert(
            title,
            message,
            [
                { text: 'Hủy', onPress: () => resolve(false), style: 'cancel' },
                { text: 'Xác nhận', onPress: () => resolve(true) }
            ]
        );
    });
};

export default AlertModal;

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: width * 0.8,
        maxWidth: 320,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 2,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    iconCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    icon: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
    },
    message: {
        fontSize: 14,
        color: '#555',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 40,
        borderRadius: 25,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '600',
    },
});
