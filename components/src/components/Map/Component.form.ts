import baseEditForm from 'formiojs/components/_classes/component/Component.form';
import EditData from './editForm/Component.edit.data';
import EditDisplay from './editForm/Component.edit.display';
import EditValidation from './editForm/Component.edit.validation';
import SimpleApi from '../Common/Simple.edit.api';
import SimpleConditional from '../Common/Simple.edit.conditional';
export default function (...extend) {
    return baseEditForm([
        EditDisplay,
        EditData,
        {
            key: 'api',
            ignore: true
        },
        {
            key: 'layout',
            ignore: true
        },
        {
            key: 'conditional',
            ignore: true
        },
        {
            key: 'logic',
            ignore: true
        },
        {
            label: 'Validation',
            key: 'customValidation',
            weight: 20,
            components: EditValidation
        },
        {
            label: 'API',
            key: 'customAPI',
            weight: 30,
            components: SimpleApi
        },
        {
            label: 'Conditional',
            key: 'customConditional',
            weight: 40,
            components: SimpleConditional
        }
    ], ...extend);
}
