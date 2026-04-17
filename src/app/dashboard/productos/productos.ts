import { Component, inject, signal, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

const API = 'http://localhost:3000';

@Component({
  selector: 'app-productos',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './productos.html',
  styleUrl: './productos.scss'
})
export class Productos implements OnInit {
  private http = inject(HttpClient);
  private fb = inject(FormBuilder);

  productos = signal<any[]>([]);
  categorias = signal<any[]>([]);
  showModal = signal(false);
  editingId = signal<number | null>(null);
  loading = signal(false);
  previewImg = signal<string | null>(null);
  viewMode = signal<'grid' | 'list'>('grid');

  form = this.fb.group({
    name: ['', Validators.required],
    description: [''],
    sku: ['', Validators.required],
    price: [0, [Validators.required, Validators.min(0)]],
    cost: [0, [Validators.required, Validators.min(0)]],
    stock: [0],
    minStock: [0],
    unit: ['unidad'],
    isActive: [true],
    productTypeId: [null],
    venueId: [1],
    imageUrl: [''],
  });

  ngOnInit() {
    this.loadProductos();
    this.http.get<any[]>(`${API}/inventario/tipos`).subscribe(d => this.categorias.set(d));
  }

  loadProductos() {
    this.http.get<any[]>(`${API}/productos`).subscribe(d => this.productos.set(d));
  }

  openCreate() {
    this.editingId.set(null);
    this.previewImg.set(null);
    this.form.reset({ unit: 'unidad', isActive: true, venueId: 1, stock: 0, minStock: 0, price: 0, cost: 0 });
    this.showModal.set(true);
  }

  openEdit(p: any) {
    this.editingId.set(p.id);
    this.previewImg.set(p.imageUrl || null);
    this.form.patchValue({
      ...p,
      imageUrl: p.imageUrl || '',
      productTypeId: p.productType?.id ?? p.productTypeId,
    });
    this.showModal.set(true);
  }

  onImageChange(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e: any) => {
      img.onload = () => {
        // Redimensionar a máximo 400x400
        const MAX = 400;
        let w = img.width;
        let h = img.height;
        if (w > h) { if (w > MAX) { h = h * MAX / w; w = MAX; } }
        else { if (h > MAX) { w = w * MAX / h; h = MAX; } }
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        // Comprimir a JPEG calidad 0.7
        const compressed = canvas.toDataURL('image/jpeg', 0.7);
        this.previewImg.set(compressed);
        this.form.patchValue({ imageUrl: compressed });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  save() {
    if (this.form.invalid) return;
    this.loading.set(true);
    const val = this.form.value;
    const payload = {
      ...val,
      venueId: 1,
      productTypeId: val.productTypeId ? Number(val.productTypeId) : null,
      price: Number(val.price),
      cost: Number(val.cost),
      stock: Number(val.stock),
      minStock: Number(val.minStock),
      imageUrl: val.imageUrl || null,
    };

    const req = this.editingId()
      ? this.http.put(`${API}/productos/${this.editingId()}`, payload)
      : this.http.post(`${API}/productos`, payload);

    req.subscribe({
      next: () => { this.loadProductos(); this.showModal.set(false); this.loading.set(false); },
      error: (err) => { console.error('Error guardando producto:', err); this.loading.set(false); }
    });
  }

  delete(id: number) {
    if (!confirm('¿Eliminar este producto?')) return;
    this.http.delete(`${API}/productos/${id}`).subscribe(() => this.loadProductos());
  }

  toggleActive(p: any) {
    this.http.put(`${API}/productos/${p.id}`, { isActive: !p.isActive }).subscribe(() => this.loadProductos());
  }
}
