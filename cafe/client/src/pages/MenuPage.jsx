import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import { api, allRecords, money, message } from '../api';
import { useAuth } from '../Auth';
import {
  PageTitle,
  useTable,
  useLoad,
  SearchInput,
  Pager,
  Modal,
  Form,
  Field,
  Alert,
  Loading,
  Empty,
  Badge,
  CoffeeArt,
} from '../components/UI';
const blank = {
  name: '',
  category: 'Coffee',
  description: '',
  price: '',
  visual: 'latte',
  active: true,
  recipe: [],
};
function Editor({ item, onClose, onSaved }) {
  const [ingredients, setIngredients] = useState([]),
    [error, setError] = useState(''),
    [recipe, setRecipe] = useState(
      item.recipe.map((r) => ({
        ingredient: r.ingredient?._id || r.ingredient,
        quantity: r.quantity,
      })),
    );
  useEffect(() => {
    let live = true;
    allRecords('/ingredients')
      .then((d) => live && setIngredients(d))
      .catch((e) => live && setError(message(e)));
    return () => {
      live = false;
    };
  }, []);
  return (
    <Modal title={item._id ? 'Edit product & recipe' : 'Add menu product'} onClose={onClose} wide>
      <Alert>{error}</Alert>
      <Form
        onSubmit={async (f) => {
          const data = {
            name: f.get('name'),
            category: f.get('category'),
            description: f.get('description'),
            price: Math.round(Number(f.get('price')) * 100),
            visual: f.get('visual'),
            active: f.get('active') === 'on',
            recipe: recipe.map((r) => ({ ...r, quantity: Number(r.quantity) })),
          };
          if (item._id) await api.patch('/menu/' + item._id, data);
          else await api.post('/menu', data);
          onSaved();
        }}
        submit={item._id ? 'Save product' : 'Add product'}
      >
        <div className="form-grid">
          <Field label="Product name">
            <input name="name" required minLength={2} maxLength={100} defaultValue={item.name} />
          </Field>
          <Field label="Category">
            <select name="category" defaultValue={item.category}>
              <option>Coffee</option>
              <option>Non-coffee</option>
              <option>Pastries</option>
            </select>
          </Field>
          <Field label="Selling price (PHP)">
            <input
              name="price"
              type="number"
              required
              min="0.01"
              max="10000"
              step="0.01"
              defaultValue={item.price ? item.price / 100 : ''}
            />
          </Field>
          <Field label="Product illustration">
            <select name="visual" defaultValue={item.visual}>
              {['latte', 'espresso', 'matcha', 'chocolate', 'tea', 'pastry'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description">
          <textarea name="description" maxLength={300} defaultValue={item.description} rows={2} />
        </Field>
        <label className="check-field">
          <input type="checkbox" name="active" defaultChecked={item.active} />
          Active on the menu
        </label>
        <div className="section-heading">
          <div>
            <h3>Recipe per serving</h3>
            <p>Quantities use each ingredient's base unit.</p>
          </div>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => setRecipe([...recipe, { ingredient: '', quantity: 1 }])}
          >
            <Plus size={16} />
            Ingredient
          </button>
        </div>
        {!recipe.length && (
          <p className="notice">Add at least one ingredient to calculate availability.</p>
        )}
        {recipe.map((r, index) => (
          <div className="recipe-row" key={index}>
            <select
              aria-label={`Ingredient ${index + 1}`}
              required
              value={r.ingredient}
              onChange={(e) =>
                setRecipe(
                  recipe.map((x, k) => (k === index ? { ...x, ingredient: e.target.value } : x)),
                )
              }
            >
              <option value="">Select ingredient</option>
              {ingredients.map((i) => (
                <option value={i._id} key={i._id}>
                  {i.name} ({i.unit})
                </option>
              ))}
            </select>
            <input
              aria-label={`Recipe quantity ${index + 1}`}
              type="number"
              required
              min="1"
              max="100000"
              step="1"
              value={r.quantity}
              onChange={(e) =>
                setRecipe(
                  recipe.map((x, k) => (k === index ? { ...x, quantity: e.target.value } : x)),
                )
              }
            />
            <button
              type="button"
              className="icon-button danger-text"
              aria-label="Remove ingredient"
              onClick={() => setRecipe(recipe.filter((_, k) => k !== index))}
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </Form>
    </Modal>
  );
}
export default function MenuPage() {
  const { user } = useAuth(),
    t = useTable(),
    [editing, setEditing] = useState(null),
    [detail, setDetail] = useState(null),
    [deleting, setDeleting] = useState(null),
    [success, setSuccess] = useState('');
  const { data, error, loading } = useLoad('/menu?' + t.query, t.version);
  const saved = () => {
    setEditing(null);
    setDeleting(null);
    setSuccess('Menu updated successfully.');
    t.refresh();
  };
  return (
    <>
      <PageTitle
        title="Menu & recipes"
        subtitle="Your signature drinks, down to the last ingredient."
      >
        {user.role === 'manager' && (
          <button className="btn btn-primary" onClick={() => setEditing(blank)}>
            <Plus size={17} />
            Add product
          </button>
        )}
      </PageTitle>
      <Alert success>{success}</Alert>
      <section className="panel">
        <div className="toolbar">
          <SearchInput value={t.q} onChange={t.setQ} placeholder="Search menu items…" />
          <span className="muted">Availability is calculated from ingredient stock.</span>
        </div>
        <Alert>{error}</Alert>
        {loading ? (
          <Loading />
        ) : data?.items.length ? (
          <div className="table-responsive">
            <table className="table spot-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Price</th>
                  <th>Available servings</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((m) => (
                  <tr key={m._id}>
                    <td>
                      <div className="product-cell">
                        <CoffeeArt variant={m.visual} />
                        <span>
                          <b>{m.name}</b>
                          <small>{m.recipe.length} ingredients</small>
                        </span>
                      </div>
                    </td>
                    <td>{m.category}</td>
                    <td>{money(m.price)}</td>
                    <td>
                      <Badge tone={m.available ? 'green' : 'red'}>
                        {m.available || 'Out of stock'}
                      </Badge>
                    </td>
                    <td>
                      <Badge tone={m.active ? 'gray' : 'red'}>
                        {m.active ? 'Active' : 'Archived'}
                      </Badge>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-button"
                          aria-label={`View recipe for ${m.name}`}
                          onClick={() => setDetail(m)}
                        >
                          <BookOpen size={17} />
                        </button>
                        {user.role === 'manager' && (
                          <>
                            <button
                              className="icon-button"
                              aria-label={`Edit ${m.name}`}
                              onClick={() => setEditing(m)}
                            >
                              <Pencil size={17} />
                            </button>
                            <button
                              className="icon-button danger-text"
                              aria-label={`Delete ${m.name}`}
                              onClick={() => setDeleting(m)}
                            >
                              <Trash2 size={17} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty title="No menu items found" />
        )}
        <Pager data={data} page={t.page} setPage={t.setPage} />
      </section>
      {editing && <Editor item={editing} onClose={() => setEditing(null)} onSaved={saved} />}{' '}
      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <p>{detail.description}</p>
          <div className="detail-price">
            {money(detail.price)} <small>per serving</small>
          </div>
          <h3>Recipe</h3>
          {detail.recipe.map((r, k) => (
            <div className="detail-row" key={k}>
              <span>{r.ingredient?.name || 'Unavailable ingredient'}</span>
              <b>
                {r.quantity} {r.ingredient?.unit}
              </b>
            </div>
          ))}
          <p className="muted">
            Current stock can make {detail.available} servings. Shared ingredients are checked again
            at checkout.
          </p>
        </Modal>
      )}
      {deleting && (
        <Modal title="Delete product" onClose={() => setDeleting(null)}>
          <p>
            Delete <b>{deleting.name}</b>? Products with sales history must be archived using Edit
            instead.
          </p>
          <Form
            submit="Delete product"
            onSubmit={async () => {
              await api.delete('/menu/' + deleting._id);
              saved();
            }}
          />
        </Modal>
      )}
    </>
  );
}
