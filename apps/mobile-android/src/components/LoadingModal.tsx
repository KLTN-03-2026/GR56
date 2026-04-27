import React from 'react';
import { View, Modal, StyleSheet, Text } from 'react-native';
import LottieView from 'lottie-react-native';

interface LoadingModalProps {
    visible: boolean;
    message?: string;
}

const LoadingModal: React.FC<LoadingModalProps> = ({ visible, message = "Đang tải..." }) => {
    return (
        <Modal transparent={true} animationType="fade" visible={visible}>
            <View style={styles.modalBackground}>
                <View style={styles.activityIndicatorWrapper}>
                    <LottieView
                        source={require('../assets/shipper_new2.json')}
                        autoPlay
                        loop
                        style={{ width: 200, height: 200 }}
                    />
                    <Text style={styles.messageText}>{message}</Text>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalBackground: {
        flex: 1,
        alignItems: 'center',
        flexDirection: 'column',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    activityIndicatorWrapper: {
        backgroundColor: '#FFFFFF',
        height: 180,
        width: 180,
        borderRadius: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    messageText: {
        marginTop: -10,
        fontSize: 15,
        color: '#333',
        fontWeight: '600',
        textAlign: 'center',
    }
});

export default LoadingModal;
