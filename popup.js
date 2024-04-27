
//---------------popup part-----------------------//
L.Popup.mergeOptions({
    removable: true, //default
    editable: true, //default
})

L.Popup.include({
    // modifying the _initLayout method to include edit and remove buttons for popup layout
    // based on the source code
    _initLayout: function () {
        var prefix = 'leaflet-popup',
            container = this._container = L.DomUtil.create('div',
                `${prefix} ${this.options.className || ''} leaflet-zoom-animated`);

        var wrapper = this._wrapper = L.DomUtil.create('div', `${prefix}-content-wrapper`, container);
        this._contentNode = L.DomUtil.create('div', `${prefix}-content`, wrapper);

        L.DomEvent.disableClickPropagation(wrapper);
        L.DomEvent.disableScrollPropagation(this._contentNode);
        L.DomEvent.on(wrapper, 'contextmenu', L.DomEvent.stopPropagation);

        this._tipContainer = L.DomUtil.create('div', `${prefix}-tip-container`, container);
        this._tip = L.DomUtil.create('div', `${prefix}-tip`, this._tipContainer);

        if (this.options.closeButton) {
            var closeButton = this._closeButton = L.DomUtil.create('a', `${prefix}-close-button`, container);
            closeButton.href = '#close';
            closeButton.innerHTML = '&#215;';

            L.DomEvent.on(closeButton, 'click', () => this._onCloseButtonClick, this);
        }


        // default layout
        if (this.options.editable && this.options.removable) {
            var userActionButtons = this._userActionButtons = L.DomUtil.create('div', prefix + '-useraction-buttons', wrapper);
            var removeButton = this._removeButton = L.DomUtil.create('a', prefix + '-remove-button', userActionButtons);
            removeButton.href = '#close';
            removeButton.innerHTML = `Remove`;
            var editButton = this._editButton = L.DomUtil.create('a', prefix + '-edit-button', userActionButtons);
            editButton.href = '#edit';
            editButton.innerHTML = 'Edit';
            this.options.minWidth = 160;

            L.DomEvent.on(removeButton, 'click', this._onRemoveClick, this);
            L.DomEvent.on(editButton, 'click', this._onEditClick, this);
        }


        if (this.options.removable && !this.options.editable) {
            var userActionButtons = this._userActionButtons = L.DomUtil.create('div', prefix + '-useraction-buttons', wrapper);
            var removeButton = this._removeButton = L.DomUtil.create('a', prefix + '-remove-button', userActionButtons);
            removeButton.href = '#close';
            removeButton.innerHTML = `Remove`;
            this.options.minWidth = 110;

            L.DomEvent.on(removeButton, 'click', this._onRemoveClick, this);
        }

        if (this.options.editable && !this.options.removable) {
            var userActionButtons = this._userActionButtons = L.DomUtil.create('div', prefix + '-useraction-buttons', wrapper);
            var editButton = this._editButton = L.DomUtil.create('a', prefix + '-edit-button', userActionButtons);
            editButton.href = '#edit';
            editButton.innerHTML = 'Edit';

            L.DomEvent.on(editButton, 'click', this._onEditClick, this);
        }

    },

    _onRemoveClick: function (e) {
        this._source.remove()
        L.DomEvent.stop(e);
        var event = new CustomEvent("removeSource", {
            detail: {
                layer: this._source
            }
        });
        document.dispatchEvent(event);
    },

    _onEditClick: function (e) {

        this._contentNode.style.display = "none";
        this._userActionButtons.style.display = "none";

        var wrapper = this._wrapper;
        var editScreen = this._editScreen = L.DomUtil.create('div', 'leaflet-popup-edit-screen', wrapper)
        var inputField = this._inputField = L.DomUtil.create('div', 'leaflet-popup-input', editScreen);
        inputField.setAttribute("contenteditable", "true");
        inputField.innerHTML = this.getContent()

        var inputActions = this._inputActions = L.DomUtil.create('div', 'leaflet-popup-input-actions', editScreen);
        var cancelButton = this._cancelButton = L.DomUtil.create('a', 'leaflet-popup-input-cancel', inputActions);
        cancelButton.href = '#cancel';
        cancelButton.innerHTML = 'Cancel';
        var saveButton = this._saveButton = L.DomUtil.create('a', 'leaflet-popup-input-save', inputActions);
        saveButton.href = "#save-popup";
        saveButton.innerHTML = 'Save';

        L.DomEvent.on(cancelButton, 'click', this._onCancelClick, this)
        L.DomEvent.on(saveButton, 'click', this._onSaveButtonClick, this)

        this.update();
        L.DomEvent.stop(e);
    },


    _onCancelClick: function (e) {
        L.DomUtil.remove(this._editScreen);
        this._contentNode.style.display = "block";
        this._userActionButtons.style.display = "flex";

        this.update();
        L.DomEvent.stop(e);
    },

    _onSaveButtonClick: function (e) {
        var inputField = this._inputField;
        if (inputField.innerHTML.length > 0) {
            this.setContent(inputField.innerHTML)
        }
        L.DomUtil.remove(this._editScreen);
        this._contentNode.style.display = "block";
        this._userActionButtons.style.display = "flex";

        this.update();
        L.DomEvent.stop(e);
        var event = new CustomEvent("savePopup", {
            detail: {
                layer: this._source
            }
        });
        document.dispatchEvent(event);
    }
})
//---------------popup part end-----------------------//