import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [display, setDisplay] = useState('');
  const [history, setHistory] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [calcName, setCalcName] = useState('');
  const [pendingResult, setPendingResult] = useState('');

  useEffect(() => {
    loadHistory();
  }, []);

  // Salvar e carregar do armazenamento local
  const saveHistoryToStorage = async (newHistory) => {
    try {
      await AsyncStorage.setItem('@calc_history', JSON.stringify(newHistory));
    } catch (e) {
      Alert.alert('Erro', 'Falha ao salvar no dispositivo');
    }
  };

  const loadHistory = async () => {
    try {
      const saved = await AsyncStorage.getItem('@calc_history');
      if (saved) setHistory(JSON.parse(saved));
    } catch (e) {
      Alert.alert('Erro', 'Falha ao carregar histórico');
    }
  };

  // Lógica dos botões
  const handlePress = (value) => {
    setDisplay((prev) => prev + value);
  };

  const clearDisplay = () => {
    setDisplay('');
  };

  const calculate = () => {
    try {
      // Avalia a expressão matemática simples
      const result = eval(display.replace(/×/g, '*').replace(/÷/g, '/')).toString();
      setPendingResult(result);
      setModalVisible(true);
    } catch (e) {
      Alert.alert('Erro', 'Expressão inválida');
    }
  };

  const confirmSave = () => {
    if (!calcName.trim()) {
      Alert.alert('Aviso', 'Digite um nome para o cálculo');
      return;
    }
    const newItem = {
      id: Date.now().toString(),
      name: calcName,
      expression: display,
      result: pendingResult,
    };
    const updatedHistory = [newItem, ...history];
    setHistory(updatedHistory);
    saveHistoryToStorage(updatedHistory);

    setDisplay(pendingResult);
    setCalcName('');
    setModalVisible(false);
  };

  // Reutilizar cálculo salvo
  const reuseCalculation = (item) => {
    setDisplay(item.result);
  };

  const deleteItem = (id) => {
    const updatedHistory = history.filter((item) => item.id !== id);
    setHistory(updatedHistory);
    saveHistoryToStorage(updatedHistory);
  };

  return (
    <View style={styles.container}>
      {/* Tela da Calculadora */}
      <View style={styles.displayContainer}>
        <TextInput
          style={styles.displayText}
          value={display}
          onChangeText={setDisplay}
          placeholder="0"
          placeholderTextColor="#666"
          keyboardType="numeric"
        />
      </View>

      {/* Teclado */}
      <View style={styles.keypad}>
        {['7', '8', '9', '÷', '4', '5', '6', '×', '1', '2', '3', '-', 'C', '0', '=', '+'].map((char) => (
          <TouchableOpacity
            key={char}
            style={[
              styles.button,
              ['+', '-', '×', '÷', '='].includes(char) && styles.opButton,
              char === 'C' && styles.clearButton
            ]}
            onPress={() => {
              if (char === 'C') clearDisplay();
              else if (char === '=') calculate();
              else handlePress(char);
            }}
          >
            <Text style={styles.buttonText}>{char}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Histórico */}
      <Text style={styles.historyTitle}>Histórico Salvo</Text>
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.historyCard}>
            <TouchableOpacity
              style={{ flex: 1 }}
              onPress={() => reuseCalculation(item)}
            >
              <Text style={styles.historyName}>{item.name}</Text>
              <Text style={styles.historyDetails}>
                {item.expression} = {item.result}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => deleteItem(item.id)}>
              <Text style={styles.deleteText}>Excluir</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Modal para nomear o cálculo */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Salvar Cálculo</Text>
            <Text style={styles.modalSubtitle}>Resultado: {pendingResult}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nome do cálculo (ex: Materiais)"
              value={calcName}
              onChangeText={setCalcName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#888' }]}
                onPress={() => {
                  setDisplay(pendingResult);
                  setModalVisible(false);
                }}
              >
                <Text style={styles.btnText}>Pular</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#28a745' }]}
                onPress={confirmSave}
              >
                <Text style={styles.btnText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', padding: 20, paddingTop: 50 },
  displayContainer: { backgroundColor: '#1e1e1e', padding: 15, borderRadius: 10, marginBottom: 15 },
  displayText: { color: '#fff', fontSize: 32, textAlign: 'right' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  button: { width: '22%', backgroundColor: '#2a2a2a', padding: 18, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  opButton: { backgroundColor: '#ff9500' },
  clearButton: { backgroundColor: '#dc3545' },
  buttonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  historyTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 15, marginBottom: 10 },
  historyCard: { backgroundColor: '#1e1e1e', padding: 12, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  historyName: { color: '#ff9500', fontWeight: 'bold', fontSize: 16 },
  historyDetails: { color: '#ccc', fontSize: 14 },
  deleteText: { color: '#dc3545', marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#222', width: '80%', padding: 20, borderRadius: 10 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  modalSubtitle: { color: '#aaa', marginBottom: 15 },
  modalInput: { backgroundColor: '#333', color: '#fff', padding: 10, borderRadius: 5, marginBottom: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtn: { padding: 10, borderRadius: 5, width: '48%', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' },
});
