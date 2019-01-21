import React, { PureComponent } from 'react';
import {
    ColorPropType,
    Keyboard,
    Modal,
    Picker,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    Animated,
} from 'react-native';
import PropTypes from 'prop-types';
import isEqual from 'lodash.isequal';

const TranslateY = -30;
// const TranslateX = -16;
const defaultScale = 1;
const smallerScale = 0.8;


export default class RNPickerSelect extends PureComponent {
    static propTypes = {
        onValueChange: PropTypes.func.isRequired,
        items: PropTypes.arrayOf(
            PropTypes.shape({
                label: PropTypes.string.isRequired,
                value: PropTypes.any.isRequired,
                key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
                color: ColorPropType,
            })
        ).isRequired,
        value: PropTypes.any, // eslint-disable-line react/forbid-prop-types
        placeholder: PropTypes.shape({
            label: PropTypes.string,
            value: PropTypes.any,
            key: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            color: ColorPropType,
        }),
        disabled: PropTypes.bool,
        itemKey: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        style: PropTypes.shape({}),
        children: PropTypes.any, // eslint-disable-line react/forbid-prop-types
        hideIcon: PropTypes.bool,
        placeholderTextColor: ColorPropType,
        useNativeAndroidPickerStyle: PropTypes.bool,

        // Custom Modal props (iOS only)
        hideDoneBar: PropTypes.bool,
        doneText: PropTypes.string,
        onDonePress: PropTypes.func,
        onUpArrow: PropTypes.func,
        onDownArrow: PropTypes.func,
        onOpen: PropTypes.func,
        onClose: PropTypes.func,

        // Modal props (iOS only)
        modalProps: PropTypes.shape({}),

        // TextInput props (iOS only)
        textInputProps: PropTypes.shape({}),

        // Picker props
        pickerProps: PropTypes.shape({}),
    };

    static defaultProps = {
        value: undefined,
        placeholder: {
            label: 'Select an item...',
            value: null,
            color: '#9EA0A4',
        },
        disabled: false,
        itemKey: null,
        style: {},
        children: null,
        hideIcon: false,
        placeholderTextColor: '#C7C7CD',
        useNativeAndroidPickerStyle: true,
        hideDoneBar: false,
        doneText: 'Done',
        onDonePress: null,
        onUpArrow: null,
        onDownArrow: null,
        onOpen: null,
        onClose: null,
        modalProps: {},
        textInputProps: {},
        pickerProps: {},
    };

    static handlePlaceholder({ placeholder }) {
        if (isEqual(placeholder, {})) {
            return [];
        }
        return [placeholder];
    }

    static getSelectedItem({ items, key, value }) {
        let idx = items.findIndex((item) => {
            if (item.key && key) {
                return isEqual(item.key, key);
            }
            return isEqual(item.value, value);
        });
        if (idx === -1) {
            idx = 0;
        }
        return {
            selectedItem: items[idx],
            idx,
        };
    }

    static getDerivedStateFromProps(nextProps, prevState) {
        // update items if items prop changes
        const itemsChanged = !isEqual(prevState.items, nextProps.items);
        // update selectedItem if value prop is defined and differs from currently selected item
        const newItems = RNPickerSelect.handlePlaceholder({
            placeholder: nextProps.placeholder,
        }).concat(nextProps.items);
        const { selectedItem, idx } = RNPickerSelect.getSelectedItem({
            items: newItems,
            key: nextProps.itemKey,
            value: nextProps.value,
        });
        const selectedItemChanged =
            !isEqual(nextProps.value, undefined) && !isEqual(prevState.selectedItem, selectedItem);

        if (itemsChanged || selectedItemChanged) {
            if (selectedItemChanged) {
                nextProps.onValueChange(selectedItem.value, idx);
            }
            return {
                items: itemsChanged ? newItems : prevState.items,
                selectedItem: selectedItemChanged ? selectedItem : prevState.selectedItem,
            };
        }

        return null;
    }

    constructor(props) {
        super(props);

        const items = this.props.items;

        const { selectedItem } = RNPickerSelect.getSelectedItem({
            items,
            key: this.props.itemKey,
            value: this.props.value,
        });
        
        this.state = {
            items,
            selectedItem,
            showPicker: false,
            animationType: undefined,
            animation: new Animated.Value(0),
            scale: new Animated.Value(defaultScale),
        };
        console.log(items);
    }

    // these timeouts were a hacky first pass at ensuring the callback triggered after the modal animation
    // TODO: find a better approach
    onUpArrow = () =>  {
        const { onUpArrow } = this.props;

        this.togglePicker();
        setTimeout(onUpArrow);
    }

    onDownArrow = () => {
        const { onDownArrow } = this.props;

        this.togglePicker();
        setTimeout(onDownArrow);
    }

    onValueChange = (value, index) => {
        const { onValueChange } = this.props;

        onValueChange(value, index);

        this.setState({
          selectedItem: this.state.items[index],
        });
    }

    setInputRef = (ref) => {
        this.inputRef = ref;
    }

    getPlaceholderStyle = () => {
        const { placeholder, placeholderTextColor } = this.props;

        if (!isEqual(placeholder, {}) && this.state.selectedItem.label === placeholder.label) {
            return {
                color: placeholderTextColor,
            };
        }
        return {};
    }

    triggerOpenCloseCallbacks = () => {
      const { onOpen, onClose } = this.props;
      const { animation, selectedItem } = this.state;
      if (!this.state.showPicker) {
        this.animatedParallel(TranslateY, smallerScale);
      }
      if (this.state.showPicker && selectedItem.value.length === 0) {
        this.animatedParallel(0, defaultScale);
      };
    };

    animatedParallel = (
      transleteValue,
      fs,
      // transleteXValue: number,
    ) => {
      const { animation, scale } = this.state;
        Animated.parallel([
          Animated.spring(animation, {
            toValue: transleteValue,
            duration: 300,
            useNativeDriver: true,
          }),
          // Animated.spring(animationX, {
          //   toValue: transleteXValue,
          //   duration: 300,
          //   useNativeDriver: true,
          // }),
          Animated.timing(scale, {
            toValue: fs,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
    }


    togglePicker = (animate = false) => {
        const { modalProps, disabled } = this.props;

        if (disabled) {
            return;
        }

        const animationType =
            modalProps && modalProps.animationType ? modalProps.animationType : 'slide';

        this.triggerOpenCloseCallbacks();

        this.setState({
            animationType: animate ? animationType : undefined,
            showPicker: !this.state.showPicker,
        });

        if (!this.state.showPicker && this.inputRef) {
            this.inputRef.focus();
            this.inputRef.blur();
        }
    }

    renderPickerItems = () =>
      this.state.items.map((item) => {
        return (
            <Picker.Item
                label={item.label}
                value={item.value}
                key={item.key || item.label}
                color={item.color}
            />
        );
    });

    onCancel = () => {
      const { onCancelPress } = this.props;
      onCancelPress();
      this.setState(
        { selectedItem: {  } },
        this.animatedParallel(0, defaultScale)
        )
    }

    renderDoneBar = () => {
      const { doneText, hideDoneBar, onUpArrow, onDownArrow, onDonePress, style, onCancelPress, isFocused } = this.props;

      if (hideDoneBar) {
          return null;
      }

        return (
            <View style={[defaultStyles.modalViewMiddle, style.modalViewMiddle]} testID="done_bar">
                <View style={[defaultStyles.chevronContainer, style.chevronContainer]}>
                    {/* <TouchableOpacity
                        activeOpacity={onUpArrow ? 0.5 : 1}
                        onPress={onUpArrow ? this.onUpArrow : null}
                    >
                        <View
                            style={[
                                defaultStyles.chevron,
                                style.chevron,
                                defaultStyles.chevronUp,
                                style.chevronUp,
                                onUpArrow ? [defaultStyles.chevronActive, style.chevronActive] : {},
                            ]}
                        />
                    </TouchableOpacity>
                    <View style={{ marginHorizontal: 10 }} />
                    <TouchableOpacity
                        activeOpacity={onDownArrow ? 0.5 : 1}
                        onPress={onDownArrow ? this.onDownArrow : null}
                    >
                        <View
                            style={[
                                defaultStyles.chevron,
                                style.chevron,
                                defaultStyles.chevronDown,
                                style.chevronDown,
                                onDownArrow
                                    ? [defaultStyles.chevronActive, style.chevronActive]
                                    : {},
                            ]}
                        />
                    </TouchableOpacity> */}
                    <TouchableWithoutFeedback
                      onPress={() => {
                        this.togglePicker(true);
                        this.onCancel()
                      }}
                      hitSlop={{ top: 2, right: 2, bottom: 2, left: 2 }}
                      testID="cancel_button"
                    >
                      <View testID="needed_for_touchable">
                          <Text style={[defaultStyles.done, style.cancel]}>Cancel</Text>
                      </View>
                  </TouchableWithoutFeedback>
                </View>
                <TouchableWithoutFeedback
                    onPress={() => {
                        this.togglePicker(true);
                        if (onDonePress) {
                            onDonePress();
                        }
                    }}
                    hitSlop={{ top: 2, right: 2, bottom: 2, left: 2 }}
                    testID="done_button"
                >
                    <View testID="needed_for_touchable">
                        <Text style={[defaultStyles.done, style.done]}>{doneText}</Text>
                    </View>
                </TouchableWithoutFeedback>
            </View>
        );
    }

    renderIcon = () => {
        const { hideIcon, style } = this.props;

        if (hideIcon) {
            return null;
        }

        return <View testID="icon_ios" style={[defaultStyles.icon, style.icon]} />;
    }

    renderTextInputOrChildren = () => {
        const { children, hideIcon, style, textInputProps, inputBorder: InputBorder } = this.props;
        const { showPicker, animation, scale } = this.state;
        const containerStyle =
            Platform.OS === 'ios' ? style.inputIOSContainer : style.inputAndroidContainer;

        if (children) {
            return (
                <View pointerEvents="box-only" style={containerStyle}>
                    {children}
                </View>
            );
        }
        return (
            <View pointerEvents="box-only" style={containerStyle}>
              <Animated.Text
                style={[
                  defaultStyles.lable,
                  { opacity: showPicker ? 1 : 0.7 },
                  { transform: [
                    { translateY: animation },
                    { scaleX: scale },
                    { scaleY: scale },
                  ],
                  },
                ]}
              >
                {this.props.placeholder.lable}
              </Animated.Text>
              <TextInput
                  style={[
                      !hideIcon ? { paddingRight: 30 } : { },
                      Platform.OS === 'ios' ? style.inputIOS : style.inputAndroid,
                      // this.getPlaceholderStyle(),
                  ]}
                  value={this.state.selectedItem.label}
                  ref={this.setInputRef}
                  editable={false}
                  {...textInputProps}
              />
              <InputBorder isFocused={showPicker}/>
            </View>
        );
    }

    renderIOS = () => {
        const { style, modalProps, pickerProps } = this.props;

        return (
            <View style={[defaultStyles.viewContainer, style.viewContainer]}>
                <TouchableWithoutFeedback
                    onPress={() => {
                        Keyboard.dismiss();
                        this.togglePicker(true);
                    }}
                    testID="ios_touchable_wrapper"
                >
                    {this.renderTextInputOrChildren()}
                </TouchableWithoutFeedback>
                <Modal
                    testID="RNPickerSelectModal"
                    visible={this.state.showPicker}
                    transparent
                    animationType={this.state.animationType}
                    supportedOrientations={['portrait', 'landscape']}
                    // onOrientationChange={TODO: use this to resize window}
                    {...modalProps}
                >
                    <TouchableOpacity
                        style={[defaultStyles.modalViewTop, style.modalViewTop]}
                        onPress={() => {
                            this.togglePicker(true);
                        }}
                    />
                    {this.renderDoneBar()}
                    <View style={[defaultStyles.modalViewBottom, style.modalViewBottom]}>
                        <Picker
                            testID="RNPickerSelectIOS"
                            onValueChange={this.onValueChange}
                            selectedValue={this.state.selectedItem.value}
                            style={defaultStyles.pickerColor}
                            {...pickerProps}
                        >
                            {this.renderPickerItems()}
                        </Picker>
                    </View>
                </Modal>
            </View>
        );
    }

    renderAndroidHeadless = () => {
        const { disabled, style, pickerProps } = this.props;
        return (
            <View style={[{ borderWidth: 0 }, style.headlessAndroidContainer]}>
                {this.renderTextInputOrChildren()}
                <Picker
                    style={[defaultStyles.headlessAndroidPicker, style.headlessAndroidPicker]}
                    testID="RNPickerSelectAndroidHeadless"
                    enabled={!disabled}
                    onValueChange={this.onValueChange}
                    selectedValue={this.state.selectedItem.value}
                    {...pickerProps}
                >
                    {this.renderPickerItems()}
                </Picker>
            </View>
        );
    }

    renderAndroid = () => {
        const {
            children,
            disabled,
            hideIcon,
            style,
            pickerProps,
            useNativeAndroidPickerStyle,
        } = this.props;

        if (children) {
            return this.renderAndroidHeadless();
        }

        if (useNativeAndroidPickerStyle) {
            return (
                <View style={[defaultStyles.viewContainer, style.viewContainer]}>
                    <Picker
                        style={[
                            hideIcon ? { backgroundColor: 'transparent' } : {},
                            style.inputAndroid,
                            this.getPlaceholderStyle(),
                        ]}
                        testID="RNPickerSelectAndroid"
                        enabled={!disabled}
                        onValueChange={this.onValueChange}
                        selectedValue={this.state.selectedItem.value}
                        {...pickerProps}
                    >
                        {this.renderPickerItems()}
                    </Picker>
                    <View style={[defaultStyles.underline, style.underline]} />
                </View>
            );
        }

        return (
            <View style={[defaultStyles.viewContainer, style.viewContainer]}>
                {this.renderAndroidHeadless()}
            </View>
        );
    }

    render() {
        return Platform.OS === 'ios' ? this.renderIOS() : this.renderAndroid();
    }
}

const defaultStyles = StyleSheet.create({
    viewContainer: {
        alignSelf: 'stretch',
    },
    chevronContainer: {
        flex: 1,
        flexDirection: 'row',
        marginLeft: 25,
    },
    chevron: {
        width: 15,
        height: 15,
        backgroundColor: 'transparent',
        borderTopWidth: 1.5,
        borderTopColor: '#D0D4DB',
        borderRightWidth: 1.5,
        borderRightColor: '#D0D4DB',
    },
    chevronUp: {
        transform: [{ translateY: 17 }, { rotate: '-45deg' }],
    },
    chevronDown: {
        transform: [{ translateY: 8 }, { rotate: '135deg' }],
    },
    chevronActive: {
        borderTopColor: '#007AFE',
        borderRightColor: '#007AFE',
    },
    icon: {
        position: 'absolute',
        backgroundColor: 'transparent',
        borderTopWidth: 10,
        borderTopColor: 'gray',
        borderRightWidth: 10,
        borderRightColor: 'transparent',
        borderLeftWidth: 10,
        borderLeftColor: 'transparent',
        width: 0,
        height: 0,
        top: 20,
        right: 10,
    },
    modalViewTop: {
        flex: 1,
    },
    modalViewMiddle: {
        height: 44,
        zIndex: 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#EFF1F2',
        borderTopWidth: 0.5,
        borderTopColor: '#919498',
    },
    modalViewBottom: {
        height: 215,
        justifyContent: 'center',
        backgroundColor: '#D0D4DB',
    },
    underline: {
        borderTopWidth: 1,
        borderTopColor: '#888988',
        marginHorizontal: 4,
    },
    headlessAndroidPicker: {
        position: 'absolute',
        top: 0,
        width: 1000,
        height: 1000,
        color: 'transparent',
    },
    lable: {
      color: '#24213d',
      fontFamily: 'GTAmericaTrial-ExtendedLight',
      fontSize: 11,
      fontWeight: '300',
      letterSpacing: 0.19,
      position: 'absolute',
      top: '25%',
      left: 3,
    },
    done: {
      color: 'blue',
    },
    pickerColor: {
      backgroundColor: '#fff',
    }
});
