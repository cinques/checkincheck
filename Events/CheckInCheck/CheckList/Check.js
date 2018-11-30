define(
    'Events/CheckInCheck/CheckList/Check',
    [
        'Events/BaseCard/BaseBlock',
        'tmpl!Events/CheckInCheck/CheckList/Check',
        'css!Events/CheckInCheck/CheckList/Check'
    ],
    function (
        BaseBlock,
        template
    ) {
        'use strict';


        var Check = BaseBlock.extend({
            _dotTplFn: template,

            $protected: {
                _options: {
                    allowChangeEnable: false
                }
            },

            init: function () {
                Check.superclass.init.apply(this);
                this._initChildren();

            },

            _initChildren: function () {
                this._children = {};
            }
        });

        return Check;
    }
);
