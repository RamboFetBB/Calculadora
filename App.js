import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ScrollView,
  StatusBar,
  Linking
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function App() {
  const [activeTab, setActiveTab] = useState('calc'); // 'calc' | 'shopping' | 'history'
  const [isDarkMode, setIsDarkMode] = useState(true);

  // States Calculadora & Históricos
  const [display, setDisplay] = useState('');
  const [note, setNote] = useState('');
  const [historyGroups, setHistoryGroups] = useState([]);
  const [activeGroupId, setActiveGroupId] = useState(null);

  // States Lista de Compras
  const [shoppingList, setShoppingList] = useState([]);
  const [itemName, setItemName] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [itemPrice, setItemPrice] = useState('');
  const [importJsonInput, setImportJsonInput] = useState('');

  // Modais de Histórico
  const [groupModalVisible, setGroupModalVisible] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');

  const [editCalcModalVisible, setEditCalcModalVisible] = useState(false);
  const [editingCalcItem, setEditingCalcItem] = useState(null);
  const [editCalcValue, setEditCalcValue] = useState('');
  const [editCalcNote, setEditCalcNote] = useState('');
  const [editCalcType, setEditCalcType] = useState('ADD');

  // Modais da Lista de Compras
  const [editShopModalVisible, setEditShopModalVisible] = useState(false);
  const [editingShopItem, setEditingShopItem] = useState(null);
  const [editShopName, setEditShopName] = useState('');
  const [editShopQty, setEditShopQty] = useState('');
  const [editShopPrice, setEditShopPrice] = useState('');
  const [receiveModalVisible, setReceiveModalVisible] = useState(false);

  // Modal Escolha de Contato WhatsApp
  const [shareModalVisible, setShareModalVisible] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('@app_theme_v1');
      if (savedTheme !== null) setIsDarkMode(savedTheme === 'dark');

      const savedGroups = await AsyncStorage.getItem('@calc_groups_v5');
      if (savedGroups) {
        const parsed = JSON.parse(savedGroups);
        setHistoryGroups(parsed);
        if (parsed.length > 0) setActiveGroupId(parsed[0].id);
      } else {
        const defaultGroup = { id: 'default', name: 'Geral', items: [] };
        setHistoryGroups([defaultGroup]);
        setActiveGroupId('default');
      }

      const savedShop = await AsyncStorage.getItem('@shopping_list_v1');
      if (savedShop) setShoppingList(JSON.parse(savedShop));
    } catch (e) {
      Alert.alert('Erro', 'Falha ao carregar dados salvos');
    }
  };

  const saveData = async (groups, shopList, themeBool) => {
    try {
      if (groups) await AsyncStorage.setItem('@calc_groups_v5', JSON.stringify(groups));
      if (shopList) await AsyncStorage.setItem('@shopping_list_v1', JSON.stringify(shopList));
      if (themeBool !== undefined) await AsyncStorage.setItem('@app_theme_v1', themeBool ? 'dark' : 'light');
    } catch (e) {
      Alert.alert('Erro', 'Falha ao salvar dados');
    }
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    saveData(null, null, newTheme);
  };

  // Dynamic Theme Colors
  const theme = {
    bg: isDarkMode ? '#0D0D12' : '#F4F5F9',
    card: isDarkMode ? '#16161E' : '#FFFFFF',
    border: isDarkMode ? '#232330' : '#E2E4ED',
    text: isDarkMode ? '#FFFFFF' : '#1A1A24',
    subText: isDarkMode ? '#8E8EA0' : '#6E6E82',
    inputBg: isDarkMode ? '#16161E' : '#FFFFFF',
    primary: '#6C5CE7',
    add: '#10B981',
    sub: '#EF4444',
  };

  // --- CALCULADORA ---
  const handlePress = (value) => setDisplay((prev) => prev + value);
  const clearDisplay = () => {
    setDisplay('');
    setNote('');
  };

  const evaluateExpression = () => {
    if (!display.trim()) return 0;
    try {
      const formattedExpr = display.replace(/,/g, '.').replace(/×/g, '*').replace(/÷/g, '/');
      const raw = eval(formattedExpr);
      if (isNaN(raw)) return null;
      return raw;
    } catch (e) {
      return null;
    }
  };

  const handleSaveCalculation = (type = 'ADD') => {
    let calculatedValue = evaluateExpression();
    if (calculatedValue === null) {
      Alert.alert('Erro', 'Expressão matemática inválida');
      return;
    }

    const targetGroupId = activeGroupId || historyGroups[0]?.id || 'default';
    const newItem = {
      id: Date.now().toString(),
      value: Math.abs(calculatedValue),
      type: type,
      note: note.trim() || 'Sem observação/descrição',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: new Date().toLocaleDateString('pt-BR')
    };

    const updatedGroups = historyGroups.map((group) => {
      if (group.id === targetGroupId) {
        return { ...group, items: [newItem, ...group.items] };
      }
      return group;
    });

    setHistoryGroups(updatedGroups);
    saveData(updatedGroups, null);
    setDisplay('');
    setNote('');
    Alert.alert('Salvo!', 'Lançamento salvo no histórico.');
  };

  // --- HISTÓRICOS ---
  const handleCreateGroup = () => {
    if (!newGroupName.trim()) {
      Alert.alert('Aviso', 'Digite um nome para o histórico');
      return;
    }
    const newGroup = { id: Date.now().toString(), name: newGroupName.trim(), items: [] };
    const updated = [...historyGroups, newGroup];
    setHistoryGroups(updated);
    setActiveGroupId(newGroup.id);
    saveData(updated, null);
    setNewGroupName('');
    setGroupModalVisible(false);
  };

  const handleDeleteGroup = (groupId) => {
    if (historyGroups.length <= 1) {
      Alert.alert('Aviso', 'Você precisa ter pelo menos um histórico ativo.');
      return;
    }
    Alert.alert('Excluir Histórico', 'Deseja remover este histórico e todos os lançamentos dele?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          const updated = historyGroups.filter((g) => g.id !== groupId);
          setHistoryGroups(updated);
          setActiveGroupId(updated[0].id);
          saveData(updated, null);
        }
      }
    ]);
  };

  const openEditCalcModal = (item) => {
    setEditingCalcItem(item);
    setEditCalcValue(item.value.toString().replace('.', ','));
    setEditCalcNote(item.note);
    setEditCalcType(item.type);
    setEditCalcModalVisible(true);
  };

  const handleSaveEditCalcItem = () => {
    const valNum = parseFloat(editCalcValue.replace(',', '.'));
    if (isNaN(valNum)) {
      Alert.alert('Erro', 'Digite um valor válido');
      return;
    }

    const updatedGroups = historyGroups.map((group) => {
      if (group.id === activeGroupId) {
        const updatedItems = group.items.map((i) => {
          if (i.id === editingCalcItem.id) {
            return {
              ...i,
              value: Math.abs(valNum),
              note: editCalcNote.trim() || 'Sem observação/descrição',
              type: editCalcType
            };
          }
          return i;
        });
        return { ...group, items: updatedItems };
      }
      return group;
    });

    setHistoryGroups(updatedGroups);
    saveData(updatedGroups, null);
    setEditCalcModalVisible(false);
    setEditingCalcItem(null);
  };

  const handleDeleteCalcItem = (itemId) => {
    Alert.alert('Excluir Lançamento', 'Deseja remover este item do histórico?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          const updatedGroups = historyGroups.map((group) => {
            if (group.id === activeGroupId) {
              return { ...group, items: group.items.filter((i) => i.id !== itemId) };
            }
            return group;
          });
          setHistoryGroups(updatedGroups);
          saveData(updatedGroups, null);
          setEditCalcModalVisible(false);
        }
      }
    ]);
  };

  const getGroupTotal = (group) => {
    if (!group || !group.items) return 0;
    return group.items.reduce((acc, item) => (item.type === 'SUB' ? acc - item.value : acc + item.value), 0);
  };

  // --- LISTA DE COMPRAS ---
  const handleAddShoppingItem = () => {
    if (!itemName.trim()) {
      Alert.alert('Aviso', 'Digite o nome do item');
      return;
    }
    const qtyNum = parseFloat(itemQty.replace(',', '.')) || 1;
    const priceNum = parseFloat(itemPrice.replace(',', '.')) || 0;

    const newItem = { id: Date.now().toString(), name: itemName.trim(), qty: qtyNum, price: priceNum };
    const updatedList = [newItem, ...shoppingList];
    setShoppingList(updatedList);
    saveData(null, updatedList);

    setItemName('');
    setItemQty('1');
    setItemPrice('');
  };

  const handleConfirmDeleteShopItem = (item) => {
    Alert.alert('Confirmar Exclusão', `Deseja realmente remover "${item.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          const updated = shoppingList.filter((i) => i.id !== item.id);
          setShoppingList(updated);
          saveData(null, updated);
        }
      }
    ]);
  };

  const openEditShopModal = (item) => {
    setEditingShopItem(item);
    setEditShopName(item.name);
    setEditShopQty(item.qty.toString());
    setEditShopPrice(item.price > 0 ? item.price.toString().replace('.', ',') : '');
    setEditShopModalVisible(true);
  };

  const handleSaveEditShopItem = () => {
    if (!editShopName.trim()) {
      Alert.alert('Aviso', 'Digite o nome do item');
      return;
    }
    const qtyNum = parseFloat(editShopQty.replace(',', '.')) || 1;
    const priceNum = parseFloat(editShopPrice.replace(',', '.')) || 0;

    const updatedList = shoppingList.map((item) => {
      if (item.id === editingShopItem.id) {
        return { ...item, name: editShopName.trim(), qty: qtyNum, price: priceNum };
      }
      return item;
    });

    setShoppingList(updatedList);
    saveData(null, updatedList);
    setEditShopModalVisible(false);
    setEditingShopItem(null);
  };

  const handleImportJSONText = () => {
    if (!importJsonInput.trim()) {
      Alert.alert('Aviso', 'Cole o texto da lista recebida antes de confirmar.');
      return;
    }

    try {
      const cleanText = importJsonInput.replace(/```json/g, '').replace(/```/g, '').trim();
      const importedList = JSON.parse(cleanText);

      if (!Array.isArray(importedList)) {
        Alert.alert('Erro', 'O texto copiado não é uma lista de compras válida.');
        return;
      }

      const formattedList = importedList.map((item, index) => ({
        id: (Date.now() + index).toString(),
        name: item.name || 'Item sem nome',
        qty: Number(item.qty) || 1,
        price: Number(item.price) || 0
      }));

      const updatedList = [...formattedList, ...shoppingList];
      setShoppingList(updatedList);
      saveData(null, updatedList);

      setImportJsonInput('');
      setReceiveModalVisible(false);
      Alert.alert('Sucesso!', `${formattedList.length} itens foram adicionados à sua lista.`);
    } catch (e) {
      Alert.alert('Erro ao Importar', 'O texto copiado não é um formato válido.');
    }
  };

  const getShoppingTotal = () => shoppingList.reduce((acc, item) => acc + item.qty * item.price, 0);

  const handleSendWhatsApp = (phone) => {
    const jsonPayload = JSON.stringify(shoppingList, null, 2);
    
    // Mensagem com instruções simples e o bloco de código fácil de copiar de uma vez só
    const messageText = 
      `🛒 *Lista de Compras*\n\n` +
      `Para importar no aplicativo, pressione e segure o bloco abaixo e clique em *Copiar*:\n\n` +
      `\`\`\`\n${jsonPayload}\n\`\`\``;

    const message = encodeURIComponent(messageText);
    const url = `https://api.whatsapp.com/send?phone=55${phone}&text=${message}`;

    Linking.openURL(url).catch(() => {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp');
    });

    setShareModalVisible(false);
  };

  const activeGroup = historyGroups.find((g) => g.id === activeGroupId) || historyGroups[0];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

      {/* Top Bar (Navegação + Alternador de Tema) */}
      <View style={styles.topHeader}>
        <View style={[styles.tabContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'calc' && { backgroundColor: theme.border }]} onPress={() => setActiveTab('calc')}>
            <Text style={[styles.tabText, { color: activeTab === 'calc' ? theme.primary : theme.subText }]}>Calculadora</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'shopping' && { backgroundColor: theme.border }]} onPress={() => setActiveTab('shopping')}>
            <Text style={[styles.tabText, { color: activeTab === 'shopping' ? theme.primary : theme.subText }]}>Compras</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.tabButton, activeTab === 'history' && { backgroundColor: theme.border }]} onPress={() => setActiveTab('history')}>
            <Text style={[styles.tabText, { color: activeTab === 'history' ? theme.primary : theme.subText }]}>Históricos</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.themeToggleBtn, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={toggleTheme}>
          <Text style={{ fontSize: 16 }}>{isDarkMode ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      {/* ABA 1: CALCULADORA */}
      {activeTab === 'calc' && (
        <ScrollView contentContainerStyle={styles.calcView} showsVerticalScrollIndicator={false}>
          <View style={[styles.infoBadge, { backgroundColor: theme.card }]}>
            <Text style={[styles.infoBadgeText, { color: theme.subText }]}>
              Lançando em: <Text style={{ color: theme.primary, fontWeight: 'bold' }}>{activeGroup?.name || 'Geral'}</Text>
            </Text>
          </View>

          <TextInput
            style={[styles.noteInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border, minHeight: 65, textAlignVertical: 'top' }]}
            placeholder={'Digite uma observação/descrição para o lançamento...'}
            placeholderTextColor={theme.subText}
            value={note}
            onChangeText={setNote}
            multiline={true}
          />

          <View style={[styles.displayContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <TextInput style={[styles.displayText, { color: theme.text }]} value={display} onChangeText={setDisplay} placeholder="0 (opcional)" placeholderTextColor={theme.subText} keyboardType="numeric" />
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.add }]} onPress={() => handleSaveCalculation('ADD')}>
              <Text style={styles.actionBtnText}>+ Somar / Lançar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.sub }]} onPress={() => handleSaveCalculation('SUB')}>
              <Text style={styles.actionBtnText}>- Subtrair / Lançar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.keypad}>
            {['C', '÷', '×', '-', '7', '8', '9', '+', '4', '5', '6', '.', '1', '2', '3', ',', '0', '='].map((char) => {
              const isOp = ['+', '-', '×', '÷'].includes(char);
              const isClear = char === 'C';
              const isEqual = char === '=';

              return (
                <TouchableOpacity
                  key={char}
                  style={[
                    styles.button,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    isOp && { backgroundColor: theme.border },
                    isClear && { backgroundColor: isDarkMode ? '#2A171A' : '#FEE2E2' },
                    isEqual && { backgroundColor: theme.primary }
                  ]}
                  onPress={() => {
                    if (char === 'C') clearDisplay();
                    else if (char === '=') {
                      const res = evaluateExpression();
                      if (res !== null) setDisplay(res.toString().replace('.', ','));
                    } else handlePress(char);
                  }}
                >
                  <Text style={[styles.buttonText, { color: theme.text }, isOp && { color: theme.primary }, isClear && { color: theme.sub }, isEqual && { color: '#FFF' }]}>
                    {char}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* ABA 2: LISTA DE COMPRAS */}
      {activeTab === 'shopping' && (
        <View style={styles.historyView}>
          <View style={styles.shoppingActionHeader}>
            <TouchableOpacity style={[styles.importJsonBtn, { backgroundColor: theme.card, borderColor: theme.primary, flex: 1, marginRight: 6 }]} onPress={() => setReceiveModalVisible(true)}>
              <Text style={{ color: theme.primary, fontWeight: 'bold', fontSize: 11, textAlign: 'center' }}>📥 Receber lista de compras</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.shareBtn, { flex: 1, marginLeft: 6 }]} onPress={() => setShareModalVisible(true)}>
              <Text style={styles.shareBtnText}>Compartilhar lista de compras</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.totalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View>
              <Text style={[styles.totalLabel, { color: theme.subText }]}>Total do Carrinho:</Text>
              <Text style={[styles.totalValue, { color: theme.add }]}>R$ {getShoppingTotal().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>

          <View style={styles.shopForm}>
            <TextInput style={[styles.modalInput, { flex: 2, marginBottom: 0, marginRight: 6, backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} placeholder="Item (ex: Leite)" placeholderTextColor={theme.subText} value={itemName} onChangeText={setItemName} />
            <TextInput style={[styles.modalInput, { flex: 0.8, marginBottom: 0, marginRight: 6, backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} placeholder="Qtd" placeholderTextColor={theme.subText} keyboardType="numeric" value={itemQty} onChangeText={setItemQty} />
            <TextInput style={[styles.modalInput, { flex: 1.2, marginBottom: 0, marginRight: 6, backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]} placeholder="R$ (opcional)" placeholderTextColor={theme.subText} keyboardType="numeric" value={itemPrice} onChangeText={setItemPrice} />
            <TouchableOpacity style={[styles.addShopItemBtn, { backgroundColor: theme.add }]} onPress={handleAddShoppingItem}>
              <Text style={styles.btnText}>+</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={shoppingList}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={<View style={styles.emptyContainer}><Text style={{ color: theme.subText, fontStyle: 'italic' }}>Sua lista de compras está vazia.</Text></View>}
            renderItem={({ item }) => {
              const itemTotal = item.qty * item.price;
              return (
                <View style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.text, fontSize: 16, fontWeight: 'bold' }}>{item.qty}x {item.name}</Text>
                    <Text style={{ color: theme.subText, fontSize: 12, marginTop: 2 }}>
                      {item.price > 0 ? `R$ ${item.price.toString().replace('.', ',')} un. | Subtotal: R$ ${itemTotal.toFixed(2).replace('.', ',')}` : 'Valor não informado'}
                    </Text>
                  </View>
                  <View style={styles.itemActions}>
                    <TouchableOpacity style={[styles.editBtn, { backgroundColor: theme.border }]} onPress={() => openEditShopModal(item)}>
                      <Text style={[styles.editBtnText, { color: theme.subText }]}>Editar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: isDarkMode ? '#2A171A' : '#FEE2E2' }]} onPress={() => handleConfirmDeleteShopItem(item)}>
                      <Text style={[styles.deleteBtnText, { color: theme.sub }]}>Excluir</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* ABA 3: HISTÓRICOS */}
      {activeTab === 'history' && (
        <View style={styles.historyView}>
          <TouchableOpacity style={[styles.createGroupBtn, { backgroundColor: theme.primary }]} onPress={() => setGroupModalVisible(true)}>
            <Text style={styles.createGroupBtnText}>+ Criar Novo Histórico Nomeado</Text>
          </TouchableOpacity>

          <Text style={[styles.sectionLabel, { color: theme.subText }]}>Históricos disponíveis:</Text>
          <View style={{ maxHeight: 42, marginBottom: 15 }}>
            <FlatList
              horizontal
              data={historyGroups}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => {
                const isSelected = activeGroupId === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.groupChip, { backgroundColor: theme.card, borderColor: theme.border }, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={() => setActiveGroupId(item.id)}
                  >
                    <Text style={[styles.chipText, { color: theme.subText }, isSelected && { color: '#FFF' }]}>{item.name}</Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          <View style={[styles.totalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View>
              <Text style={[styles.totalLabel, { color: theme.subText }]}>Total em {activeGroup?.name}:</Text>
              <Text style={[styles.totalValue, { color: theme.add }]}>R$ {getGroupTotal(activeGroup).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Text>
            </View>
            {historyGroups.length > 1 && (
              <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: isDarkMode ? '#2A171A' : '#FEE2E2', paddingHorizontal: 12, paddingVertical: 8 }]} onPress={() => handleDeleteGroup(activeGroup.id)}>
                <Text style={{ color: theme.sub, fontWeight: 'bold', fontSize: 11 }}>Excluir Histórico</Text>
              </TouchableOpacity>
            )}
          </View>

          <FlatList
            data={activeGroup?.items || []}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={[styles.itemCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.itemType, item.type === 'SUB' ? { color: theme.sub } : { color: theme.add }]}>
                    {item.type === 'SUB' ? '-' : '+'} R$ {item.value.toString().replace('.', ',')}
                  </Text>
                  <Text style={{ color: theme.subText, fontSize: 13, marginTop: 4 }}>{item.note}</Text>
                  <Text style={{ color: theme.subText, fontSize: 10, marginTop: 2 }}>{item.date} às {item.timestamp}</Text>
                </View>
                <TouchableOpacity style={[styles.editBtn, { backgroundColor: theme.border }]} onPress={() => openEditCalcModal(item)}>
                  <Text style={[styles.editBtnText, { color: theme.subText }]}>Editar</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      {/* MODAL RECEBER LISTA DE COMPRAS */}
      <Modal visible={receiveModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Receber Lista de Compras</Text>
            <Text style={[styles.label, { color: theme.subText }]}>Cole o código recebido do WhatsApp abaixo:</Text>
            
            <TextInput
              style={[styles.modalInput, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, minHeight: 90, textAlignVertical: 'top' }]}
              placeholder={'Cole aqui a lista copiada...'}
              placeholderTextColor={theme.subText}
              value={importJsonInput}
              onChangeText={setImportJsonInput}
              multiline={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.border }]} onPress={() => setReceiveModalVisible(false)}>
                <Text style={{ color: theme.text, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.primary }]} onPress={handleImportJSONText}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Importar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL COMPARTILHAR WHATSAPP */}
      <Modal visible={shareModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Compartilhar Lista de Compras</Text>
            <Text style={[styles.label, { color: theme.subText }]}>Escolha o destinatário:</Text>

            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: theme.border }]} onPress={() => handleSendWhatsApp('48988045622')}>
              <Text style={{ color: theme.text, fontWeight: 'bold', textAlign: 'center' }}>Enviar para Bruno (48 98804-5622)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.contactBtn, { backgroundColor: theme.border }]} onPress={() => handleSendWhatsApp('49999450974')}>
              <Text style={{ color: theme.text, fontWeight: 'bold', textAlign: 'center' }}>Enviar para Fernanda (49 99945-0974)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.border, width: '100%', marginTop: 10 }]} onPress={() => setShareModalVisible(false)}>
              <Text style={{ color: theme.text, fontWeight: 'bold', textAlign: 'center' }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL EDITAR LANÇAMENTO DO HISTÓRICO */}
      <Modal visible={editCalcModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Editar Lançamento</Text>

            <Text style={[styles.label, { color: theme.subText }]}>Operação:</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
              <TouchableOpacity style={[styles.actionBtn, { width: '48%', backgroundColor: editCalcType === 'ADD' ? theme.add : theme.border }]} onPress={() => setEditCalcType('ADD')}>
                <Text style={styles.actionBtnText}>+ Adição</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { width: '48%', backgroundColor: editCalcType === 'SUB' ? theme.sub : theme.border }]} onPress={() => setEditCalcType('SUB')}>
                <Text style={styles.actionBtnText}>- Subtração</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: theme.subText }]}>Valor:</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} keyboardType="numeric" value={editCalcValue} onChangeText={setEditCalcValue} />

            <Text style={[styles.label, { color: theme.subText }]}>Observação / Itens:</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border, minHeight: 60 }]} multiline value={editCalcNote} onChangeText={setEditCalcNote} />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: isDarkMode ? '#2A171A' : '#FEE2E2' }]} onPress={() => handleDeleteCalcItem(editingCalcItem?.id)}>
                <Text style={{ color: theme.sub, fontWeight: 'bold' }}>Excluir</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.primary }]} onPress={handleSaveEditCalcItem}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL EDITAR ITEM DA LISTA DE COMPRAS */}
      <Modal visible={editShopModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Editar Item da Lista</Text>

            <Text style={[styles.label, { color: theme.subText }]}>Nome do Item:</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} value={editShopName} onChangeText={setEditShopName} />

            <Text style={[styles.label, { color: theme.subText }]}>Quantidade:</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} keyboardType="numeric" value={editShopQty} onChangeText={setEditShopQty} />

            <Text style={[styles.label, { color: theme.subText }]}>Valor Unitário (R$):</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} keyboardType="numeric" placeholder="0,00" value={editShopPrice} onChangeText={setEditShopPrice} />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.border }]} onPress={() => setEditShopModalVisible(false)}>
                <Text style={{ color: theme.text, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.primary }]} onPress={handleSaveEditShopItem}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL CRIAR HISTÓRICO */}
      <Modal visible={groupModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Novo Histórico</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: theme.bg, color: theme.text, borderColor: theme.border }]} placeholder="Nome do histórico" placeholderTextColor={theme.subText} value={newGroupName} onChangeText={setNewGroupName} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.border }]} onPress={() => setGroupModalVisible(false)}>
                <Text style={{ color: theme.text, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: theme.primary }]} onPress={handleCreateGroup}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Criar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 40 },
  topHeader: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 12, marginBottom: 10 },
  tabContainer: { flex: 1, flexDirection: 'row', borderRadius: 14, padding: 4, borderWidth: 1, marginRight: 8 },
  tabButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabText: { fontWeight: '600', fontSize: 13 },
  themeToggleBtn: { padding: 10, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },

  calcView: { paddingHorizontal: 16, paddingBottom: 20 },
  infoBadge: { alignSelf: 'flex-end', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
  infoBadgeText: { fontSize: 12 },
  noteInput: { padding: 12, borderRadius: 12, fontSize: 13, marginBottom: 10, borderWidth: 1 },

  displayContainer: { padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, minHeight: 75, justifyContent: 'center' },
  displayText: { fontSize: 34, textAlign: 'right', fontWeight: '600' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  actionBtn: { width: '48%', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  keypad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  button: { width: '22%', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 10, borderWidth: 1 },
  buttonText: { fontSize: 22, fontWeight: '500' },

  historyView: { flex: 1, paddingHorizontal: 16 },
  shoppingActionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  importJsonBtn: { paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  shareBtn: { backgroundColor: '#25D366', paddingHorizontal: 10, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  shareBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 11, textAlign: 'center' },

  shopForm: { flexDirection: 'row', marginBottom: 12, alignItems: 'center' },
  addShopItemBtn: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  contactBtn: { padding: 14, borderRadius: 10, marginBottom: 10 },

  createGroupBtn: { padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  createGroupBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  sectionLabel: { fontSize: 12, marginBottom: 8 },
  groupChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, height: 36, justifyContent: 'center', borderWidth: 1 },
  chipText: { fontWeight: '600', fontSize: 13 },

  totalCard: { padding: 16, borderRadius: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1 },
  totalLabel: { fontSize: 12 },
  totalValue: { fontSize: 24, fontWeight: 'bold', marginTop: 2 },

  itemCard: { padding: 14, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 8, borderWidth: 1 },
  itemType: { fontSize: 16, fontWeight: 'bold' },

  itemActions: { flexDirection: 'row', marginLeft: 8 },
  editBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, marginRight: 6 },
  editBtnText: { fontSize: 11, fontWeight: '600' },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  deleteBtnText: { fontSize: 11, fontWeight: '600' },

  emptyContainer: { alignItems: 'center', marginTop: 30 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', padding: 20, borderRadius: 16, borderWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 14 },
  label: { fontSize: 12, marginBottom: 6 },
  modalInput: { padding: 12, borderRadius: 10, marginBottom: 14, borderWidth: 1 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtn: { padding: 12, borderRadius: 10, width: '48%', alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold' }
});
