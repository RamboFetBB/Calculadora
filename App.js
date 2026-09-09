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
  const [activeTab, setActiveTab] = useState('calc'); // 'calc' ou 'history'
  const [display, setDisplay] = useState('');
  const [historyGroups, setHistoryGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);
  
  // Modal para criar novo bloco/pasta de histórico
  const [modalVisible, setModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem('@calc_groups_v2');
      if (saved) {
        setHistoryGroups(JSON.parse(saved));
      } else {
        // Criar grupo padrão caso não exista
        const defaultGroup = { id: 'default', name: 'Geral / Sem Nome', items: [] };
        setHistoryGroups([defaultGroup]);
        setActiveGroupId('default');
      }
    } catch (e) {
      Alert.alert('Erro', 'Falha ao carregar histórico');
    }
  };

  const saveData = async (data) => {
    try {
      await AsyncStorage.setItem('@calc_groups_v2', JSON.stringify(data));
    } catch (e) {
      Alert.alert('Erro', 'Falha ao salvar dados');
    }
  };

  // Trata digitação
  const handlePress = (value) => {
    setDisplay((prev) => prev + value);
  };

  const clearDisplay = () => {
    setDisplay('');
  };

  // Processa o cálculo e salva automaticamente
  const calculate = () => {
    if (!display.trim()) return;

    try {
      // Substitui vírgulas por pontos e os símbolos visuais
      const formattedExpr = display
        .replace(/,/g, '.')
        .replace(/×/g, '*')
        .replace(/÷/g, '/');

      const rawResult = eval(formattedExpr);
      const resultStr = Number.isInteger(rawResult) 
        ? rawResult.toString() 
        : rawResult.toFixed(4).replace(/\.?0+$/, ''); // Limpa zeros sobressalentes

      const newItem = {
        id: Date.now().toString(),
        expression: display,
        result: resultStr,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      // Adiciona o item ao grupo ativo atual
      const targetGroupId = activeGroupId || historyGroups[0]?.id || 'default';
      const updatedGroups = historyGroups.map((group) => {
        if (group.id === targetGroupId) {
          return { ...group, items: [newItem, ...group.items] };
        }
        return group;
      });

      setHistoryGroups(updatedGroups);
      saveData(updatedGroups);
      setDisplay(resultStr); // Atualiza o visor com o resultado para poder continuar calculando

    } catch (e) {
      Alert.alert('Erro', 'Expressão matemática inválida');
    }
  };

  // Criar um novo histórico nomeado
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      Alert.alert('Aviso', 'Digite um nome para o histórico');
      return;
    }
    const newGroup = {
      id: Date.now().toString(),
      name: newGroupName.trim(),
      items: []
    };

    const updated = [newGroup, ...historyGroups];
    setHistoryGroups(updated);
    setActiveGroupId(newGroup.id);
    saveData(updated);

    setNewGroupName('');
    setModalVisible(false);
  };

  // Excluir um grupo inteiro de histórico
  const deleteGroup = (id) => {
    if (historyGroups.length <= 1) {
      Alert.alert('Aviso', 'Você precisa manter pelo menos um histórico ativo.');
      return;
    }
    const updated = historyGroups.filter((g) => g.id !== id);
    setHistoryGroups(updated);
    if (activeGroupId === id) {
      setActiveGroupId(updated[0].id);
    }
    saveData(updated);
  };

  // Puxar o resultado de volta para o visor da calculadora
  const loadItemToDisplay = (value) => {
    setDisplay((prev) => prev + value);
    setActiveTab('calc');
  };

  const activeGroup = historyGroups.find((g) => g.id === activeGroupId) || historyGroups[0];

  return (
    <View style={styles.container}>
      {/* Menu Superior de Abas */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'calc' && styles.activeTabButton]}
          onPress={() => setActiveTab('calc')}
        >
          <Text style={[styles.tabText, activeTab === 'calc' && styles.activeTabText]}>
            Calculadora
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'history' && styles.activeTabButton]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            Históricos
          </Text>
        </TouchableOpacity>
      </View>

      {/* ABA 1: CALCULADORA */}
      {activeTab === 'calc' && (
        <View style={styles.calcView}>
          <Text style={styles.activeGroupTag}>
            Salvando em: <Text style={{ color: '#ff9500' }}>{activeGroup?.name || 'Geral'}</Text>
          </Text>

          <View style={styles.displayContainer}>
            <TextInput
              style={styles.displayText}
              value={display}
              onChangeText={setDisplay}
              placeholder="0"
              placeholderTextColor="#555"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.keypad}>
            {[
              'C', '÷', '×', '-',
              '7', '8', '9', '+',
              '4', '5', '6', '.',
              '1', '2', '3', ',',
              '0', '='
            ].map((char) => {
              const isOp = ['+', '-', '×', '÷', '='].includes(char);
              const isClear = char === 'C';
              const isEqual = char === '=';

              return (
                <TouchableOpacity
                  key={char}
                  style={[
                    styles.button,
                    isOp && styles.opButton,
                    isClear && styles.clearButton,
                    isEqual && styles.equalButton
                  ]}
                  onPress={() => {
                    if (char === 'C') clearDisplay();
                    else if (char === '=') calculate();
                    else handlePress(char);
                  }}
                >
                  <Text style={styles.buttonText}>{char}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ABA 2: HISTÓRICOS */}
      {activeTab === 'history' && (
        <View style={styles.historyView}>
          <TouchableOpacity
            style={styles.createGroupBtn}
            onPress={() => setModalVisible(true)}
          >
            <Text style={styles.createGroupBtnText}>+ Criar Novo Histórico Nomeado</Text>
          </TouchableOpacity>

          {/* Seleção de Bloco / Pasta */}
          <Text style={styles.sectionLabel}>Selecione a Lista Ativa:</Text>
          <View style={{ maxHeight: 50, marginBottom: 15 }}>
            <FlatList
              horizontal
              data={historyGroups}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.groupChip,
                    activeGroupId === item.id && styles.activeGroupChip
                  ]}
                  onPress={() => setActiveGroupId(item.id)}
                >
                  <Text style={[
                    styles.chipText,
                    activeGroupId === item.id && styles.activeChipText
                  ]}>
                    {item.name}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* Itens do histórico da lista selecionada */}
          <View style={{ flex: 1 }}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>{activeGroup?.name}</Text>
              <TouchableOpacity onPress={() => deleteGroup(activeGroup?.id)}>
                <Text style={styles.deleteGroupText}>Excluir Histórico</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={activeGroup?.items || []}
              keyExtractor={(item) => item.id}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Nenhum cálculo registrado neste histórico.</Text>
              }
              renderItem={({ item }) => (
                <View style={styles.historyCard}>
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => loadItemToDisplay(item.result)}
                  >
                    <Text style={styles.historyExpression}>{item.expression} =</Text>
                    <Text style={styles.historyResult}>{item.result}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.useBtn}
                    onPress={() => loadItemToDisplay(item.result)}
                  >
                    <Text style={styles.useBtnText}>Usar Valor</Text>
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      )}

      {/* Modal para Nomear o Histórico */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Novo Histórico</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Reforma da Casa, Compras..."
              placeholderTextColor="#888"
              value={newGroupName}
              onChangeText={setNewGroupName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#444' }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.btnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#ff9500' }]}
                onPress={handleCreateGroup}
              >
                <Text style={styles.btnText}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212', paddingTop: 45 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#1e1e1e', marginHorizontal: 15, borderRadius: 10, padding: 4 },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  activeTabButton: { backgroundColor: '#2a2a2a' },
  tabText: { color: '#888', fontWeight: 'bold', fontSize: 16 },
  activeTabText: { color: '#ff9500' },
  calcView: { flex: 1, padding: 15, justifyContent: 'flex-end' },
  activeGroupTag: { color: '#aaa', fontSize: 13, marginBottom: 8, textAlign: 'right' },
  displayContainer: { backgroundColor: '#1e1e1e', padding: 20, borderRadius: 12, marginBottom: 15 },
  displayText: { color: '#fff', fontSize: 36, textAlign: 'right' },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  button: { width: '22%', backgroundColor: '#2a2a2a', paddingVertical: 18, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  opButton: { backgroundColor: '#ff9500' },
  clearButton: { backgroundColor: '#dc3545' },
  equalButton: { width: '48%', backgroundColor: '#28a745' },
  buttonText: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  historyView: { flex: 1, padding: 15 },
  createGroupBtn: { backgroundColor: '#28a745', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 15 },
  createGroupBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
  sectionLabel: { color: '#aaa', fontSize: 12, marginBottom: 6 },
  groupChip: { backgroundColor: '#2a2a2a', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, height: 38, justifyContent: 'center' },
  activeGroupChip: { backgroundColor: '#ff9500' },
  chipText: { color: '#ccc', fontWeight: 'bold' },
  activeChipText: { color: '#fff' },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#333', pb: 5 },
  historyTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  deleteGroupText: { color: '#dc3545', fontSize: 12 },
  historyCard: { backgroundColor: '#1e1e1e', padding: 14, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  historyExpression: { color: '#aaa', fontSize: 14 },
  historyResult: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  useBtn: { backgroundColor: '#ff9500', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  useBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  emptyText: { color: '#666', fontStyle: 'italic', marginTop: 20, textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#222', width: '85%', padding: 20, borderRadius: 12 },
  modalTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  modalInput: { backgroundColor: '#333', color: '#fff', padding: 12, borderRadius: 6, marginBottom: 20 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between' },
  modalBtn: { padding: 12, borderRadius: 6, width: '48%', alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});
